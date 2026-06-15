use crate::task_writes::{
    brief_write_status, extract_markdown_writes, is_file_task_prompt, strip_code_fences,
};
use crate::agent::{build_task_chat_bundle, enabled_providers, sidecar_get_text, sidecar_post};
use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::files::{tool_read_file, tool_search_files, tool_write_file};
use crate::git::{tool_git_diff, tool_git_status, GitStatusResult};
use crate::browser::tool_browse_url;
use crate::computer_use::{
    tool_computer_click, tool_computer_focus, tool_computer_list_windows, tool_computer_screenshot,
    tool_computer_type,
};
use crate::mcp::tool_mcp_call;
use crate::plugins::tool_plugin_call;
use crate::vm::tool_run_shell;
use crate::permissions::{resolve_permission_in_conn, ResolvePermissionInput};
use crate::providers::VaultHandle;
use rusqlite::params;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;

const MAX_ITERATIONS: u32 = 20;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TaskState {
    Draft,
    Planning,
    WaitingForApproval,
    Running,
    Paused,
    Blocked,
    Completed,
    Failed,
    Cancelled,
}

impl TaskState {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Planning => "planning",
            Self::WaitingForApproval => "waiting-for-approval",
            Self::Running => "running",
            Self::Paused => "paused",
            Self::Blocked => "blocked",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::Cancelled => "cancelled",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "planning" => Self::Planning,
            "waiting-for-approval" => Self::WaitingForApproval,
            "running" => Self::Running,
            "paused" => Self::Paused,
            "blocked" => Self::Blocked,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            "cancelled" => Self::Cancelled,
            _ => Self::Draft,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanStep {
    pub title: String,
    pub subtitle: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskStep {
    pub title: String,
    pub role: Option<String>,
    pub status: String,
    pub tool: Option<String>,
    pub tool_ok: Option<bool>,
    pub output: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRecord {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub prompt: String,
    pub state: String,
    pub plan: Vec<PlanStep>,
    pub steps: Vec<TaskStep>,
    pub messages: Vec<TaskMessage>,
    pub plan_approved: bool,
    pub iteration: u32,
    pub summary: Option<String>,
    pub modified_files: Vec<String>,
    pub pending_permission_id: Option<String>,
    pub pending_edit_id: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    pub error: Option<String>,
    pub scheduled_task_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskMessage {
    pub role: String,
    pub content: String,
    pub agent_role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListItem {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub state: String,
    pub updated_at: String,
}

pub fn init_task_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            prompt TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'draft',
            plan_json TEXT NOT NULL DEFAULT '[]',
            steps_json TEXT NOT NULL DEFAULT '[]',
            messages_json TEXT NOT NULL DEFAULT '[]',
            plan_approved INTEGER NOT NULL DEFAULT 0,
            iteration INTEGER NOT NULL DEFAULT 0,
            summary TEXT,
            modified_files_json TEXT NOT NULL DEFAULT '[]',
            pending_permission_id TEXT,
            pending_edit_id TEXT,
            error TEXT,
            scheduled_task_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, updated_at DESC);
        ",
    )
    .map_err(|e| e.to_string())?;
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN provider_id TEXT", []);
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN model_id TEXT", []);
    Ok(())
}

fn load_task(conn: &Connection, id: &str) -> Result<TaskRecord, String> {
    conn.query_row(
        "SELECT id, project_id, title, prompt, state, plan_json, steps_json, messages_json,
                plan_approved, iteration, summary, modified_files_json, pending_permission_id,
                pending_edit_id, error, scheduled_task_id, provider_id, model_id, created_at, updated_at
         FROM tasks WHERE id = ?1",
        params![id],
        |row| {
            let plan: String = row.get(5)?;
            let steps: String = row.get(6)?;
            let messages: String = row.get(7)?;
            let modified: String = row.get(11)?;
            Ok(TaskRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                prompt: row.get(3)?,
                state: row.get(4)?,
                plan: serde_json::from_str(&plan).unwrap_or_default(),
                steps: serde_json::from_str(&steps).unwrap_or_default(),
                messages: serde_json::from_str(&messages).unwrap_or_default(),
                plan_approved: row.get::<_, i64>(8)? != 0,
                iteration: row.get::<_, i64>(9)? as u32,
                summary: row.get(10)?,
                modified_files: serde_json::from_str(&modified).unwrap_or_default(),
                pending_permission_id: row.get(12)?,
                pending_edit_id: row.get(13)?,
                error: row.get(14)?,
                scheduled_task_id: row.get(15)?,
                provider_id: row.get(16)?,
                model_id: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        },
    )
    .map_err(|_| "Task not found.".to_string())
}

fn save_task(conn: &Connection, task: &TaskRecord) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE tasks SET title = ?1, state = ?2, plan_json = ?3, steps_json = ?4, messages_json = ?5,
         plan_approved = ?6, iteration = ?7, summary = ?8, modified_files_json = ?9,
         pending_permission_id = ?10, pending_edit_id = ?11, error = ?12, provider_id = ?13,
         model_id = ?14, updated_at = ?15
         WHERE id = ?16",
        params![
            task.title,
            task.state,
            serde_json::to_string(&task.plan).unwrap_or_else(|_| "[]".into()),
            serde_json::to_string(&task.steps).unwrap_or_else(|_| "[]".into()),
            serde_json::to_string(&task.messages).unwrap_or_else(|_| "[]".into()),
            if task.plan_approved { 1 } else { 0 },
            task.iteration,
            task.summary,
            serde_json::to_string(&task.modified_files).unwrap_or_else(|_| "[]".into()),
            task.pending_permission_id,
            task.pending_edit_id,
            task.error,
            task.provider_id,
            task.model_id,
            now,
            task.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn title_from_prompt(prompt: &str) -> String {
    let t = prompt.trim().lines().next().unwrap_or("New task");
    if t.chars().count() > 60 {
        let sliced: String = t.chars().take(57).collect();
        format!("{}…", sliced)
    } else {
        t.to_string()
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub project_id: String,
    pub prompt: String,
}

#[tauri::command]
pub fn create_task(db: State<'_, DbState>, input: CreateTaskInput) -> Result<TaskRecord, String> {
    if input.prompt.trim().is_empty() {
        return Err("Task prompt is required.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let title = title_from_prompt(&input.prompt);
    conn.execute(
        "INSERT INTO tasks (id, project_id, title, prompt, state, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'draft', ?5, ?6)",
        params![id, input.project_id, title, input.prompt.trim(), now, now],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(input.project_id.clone()),
            task_id: Some(id.clone()),
            actor: "user".into(),
            category: "task".into(),
            action: "create".into(),
            target: None,
            summary: format!("Created task: {title}"),
            risk: Some("low".into()),
            decision: None,
            result: "succeeded".into(),
            metadata: None,
        },
    )?;

    load_task(&conn, &id)
}

pub fn create_task_for_schedule(
    db: &DbState,
    project_id: &str,
    prompt: &str,
    scheduled_task_id: &str,
) -> Result<TaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let title = format!("[Scheduled] {}", title_from_prompt(prompt));
    conn.execute(
        "INSERT INTO tasks (id, project_id, title, prompt, state, scheduled_task_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'draft', ?5, ?6, ?7)",
        params![id, project_id, title, prompt.trim(), scheduled_task_id, now, now],
    )
    .map_err(|e| e.to_string())?;
    load_task(&conn, &id)
}

pub fn create_task_for_bridge(
    db: &DbState,
    project_id: &str,
    prompt: &str,
    source: &str,
    client_type: &str,
    _client_id: &str,
) -> Result<TaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let label = match client_type {
        "chrome-extension" => "Chrome",
        "office-word" => "Word",
        "office-excel" => "Excel",
        "office-powerpoint" => "PowerPoint",
        _ => "Bridge",
    };
    let title = format!("[{label}] {}", title_from_prompt(prompt));
    conn.execute(
        "INSERT INTO tasks (id, project_id, title, prompt, state, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'draft', ?5, ?6)",
        params![id, project_id, title, prompt.trim(), now, now],
    )
    .map_err(|e| e.to_string())?;
    let _ = source;
    load_task(&conn, &id)
}

pub fn get_task_record(conn: &Connection, task_id: &str) -> Result<TaskRecord, String> {
    load_task(conn, task_id)
}

#[tauri::command]
pub fn list_tasks(db: State<'_, DbState>, project_id: String) -> Result<Vec<TaskListItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, state, updated_at FROM tasks
             WHERE project_id = ?1 ORDER BY updated_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], |row| {
            Ok(TaskListItem {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                state: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_task(db: State<'_, DbState>, task_id: String) -> Result<TaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load_task(&conn, &task_id)
}

#[derive(Debug, Deserialize)]
struct SidecarPlanResponse {
    plan: Vec<SidecarPlanStep>,
    #[serde(rename = "coordinatorMessage")]
    coordinator_message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SidecarPlanStep {
    title: String,
    subtitle: Option<String>,
    role: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SidecarUsage {
    #[serde(rename = "inputTokens")]
    input_tokens: Option<u64>,
    #[serde(rename = "outputTokens")]
    output_tokens: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct SidecarIterateResponse {
    #[serde(rename = "type")]
    response_type: String,
    role: Option<String>,
    content: Option<String>,
    #[serde(rename = "toolCalls")]
    tool_calls: Option<Vec<SidecarToolCall>>,
    complete: Option<bool>,
    summary: Option<String>,
    usage: Option<SidecarUsage>,
}

#[derive(Debug, Deserialize, Clone, Serialize)]
struct SidecarToolCall {
    id: String,
    name: String,
    arguments: serde_json::Value,
}

#[tauri::command]
pub async fn start_task(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    task_id: String,
    preferred_provider: Option<String>,
    preferred_model: Option<String>,
) -> Result<TaskRecord, String> {
    start_task_inner(&db, &vault, &task_id, preferred_provider, preferred_model).await
}

pub async fn start_task_inner(
    db: &DbState,
    vault: &VaultHandle,
    task_id: &str,
    preferred_provider: Option<String>,
    preferred_model: Option<String>,
) -> Result<TaskRecord, String> {
    let (prompt, project_id) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let task = load_task(&conn, &task_id)?;
        if task.state != TaskState::Draft.as_str() && task.state != TaskState::Planning.as_str() {
            return Err("Task already started.".into());
        }
        (task.prompt.clone(), task.project_id.clone())
    };

    let allowed = enabled_providers(&db, &vault)?;
    if allowed.is_empty() {
        return Err("Enable at least one provider.".into());
    }

    let chat = build_task_chat_bundle(
        &db,
        &vault,
        &allowed,
        "general",
        preferred_provider.as_deref(),
        preferred_model.as_deref(),
        None,
        None,
    )
    .await?;
    let plan_resp: SidecarPlanResponse = sidecar_post(
        "/task/plan",
        &serde_json::json!({
            "prompt": prompt,
            "projectId": project_id,
            "providerId": chat.provider_id,
            "modelId": chat.model_id,
            "credentials": chat.credentials,
        }),
    )
    .await?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut task = load_task(&conn, &task_id)?;
    task.state = TaskState::WaitingForApproval.as_str().into();
    task.provider_id = Some(chat.provider_id.clone());
    task.model_id = Some(chat.model_id.clone());
    task.plan = plan_resp
        .plan
        .into_iter()
        .map(|s| PlanStep {
            title: s.title,
            subtitle: s.subtitle,
            role: s.role,
        })
        .collect();
    if let Some(msg) = plan_resp.coordinator_message {
        task.messages.push(TaskMessage {
            role: "assistant".into(),
            content: msg,
            agent_role: Some("coordinator".into()),
        });
    }
    task.messages.insert(
        0,
        TaskMessage {
            role: "user".into(),
            content: prompt.clone(),
            agent_role: None,
        },
    );
    save_task(&conn, &task)?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id),
            task_id: Some(task_id.to_string()),
            actor: "coordinator".into(),
            category: "task".into(),
            action: "plan".into(),
            target: None,
            summary: format!("Generated plan with {} steps", task.plan.len()),
            risk: Some("low".into()),
            decision: None,
            result: "succeeded".into(),
            metadata: None,
        },
    )?;

    load_task(&conn, &task_id)
}

#[tauri::command]
pub fn approve_task_plan(db: State<'_, DbState>, task_id: String) -> Result<TaskRecord, String> {
    approve_task_plan_inner(&db, &task_id)
}

pub fn approve_task_plan_inner(db: &DbState, task_id: &str) -> Result<TaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut task = load_task(&conn, &task_id)?;
    if task.state != TaskState::WaitingForApproval.as_str() {
        return Err("Task is not waiting for plan approval.".into());
    }
    task.plan_approved = true;
    task.state = TaskState::Running.as_str().into();
    save_task(&conn, &task)?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(task.project_id.clone()),
            task_id: Some(task_id.to_string()),
            actor: "user".into(),
            category: "task".into(),
            action: "approve_plan".into(),
            target: None,
            summary: "User approved task plan".into(),
            risk: Some("low".into()),
            decision: Some("allow-once".into()),
            result: "allowed".into(),
            metadata: None,
        },
    )?;

    load_task(&conn, &task_id)
}

#[tauri::command]
pub async fn advance_task(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    task_id: String,
) -> Result<TaskRecord, String> {
    advance_task_inner(&db, &vault, &task_id).await
}

pub async fn advance_task_inner(
    db: &DbState,
    vault: &VaultHandle,
    task_id: &str,
) -> Result<TaskRecord, String> {
    let (state, iteration, project_id, prompt, plan, steps, messages, plan_approved, provider_id, model_id) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let task = load_task(&conn, &task_id)?;
        (
            task.state.clone(),
            task.iteration,
            task.project_id.clone(),
            task.prompt.clone(),
            task.plan.clone(),
            task.steps.clone(),
            task.messages.clone(),
            task.plan_approved,
            task.provider_id.clone(),
            task.model_id.clone(),
        )
    };

    if state != TaskState::Running.as_str() {
        return Err(format!("Task is not running (state: {state})."));
    }
    if !plan_approved {
        return Err("Plan must be approved first.".into());
    }
    if iteration >= MAX_ITERATIONS {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut task = load_task(&conn, &task_id)?;
        task.state = TaskState::Blocked.as_str().into();
        task.error = Some("Iteration budget reached.".into());
        save_task(&conn, &task)?;
        return load_task(&conn, &task_id);
    }

    let allowed = enabled_providers(&db, &vault)?;
    let chat = build_task_chat_bundle(
        &db,
        &vault,
        &allowed,
        "coding",
        None,
        None,
        provider_id.as_deref(),
        model_id.as_deref(),
    )
    .await?;

    let files_summary = if let Ok(root) = crate::files::project_folder(db, &project_id) {
        if let Ok(list) = crate::files::list_dir_internal(&root, None, 5) {
            let mut summary = String::new();
            for f in list.iter().take(150) {
                if f.is_dir {
                    summary.push_str(&format!("Directory: {}\n", f.path));
                } else {
                    summary.push_str(&format!("File: {} ({} bytes)\n", f.path, f.size.unwrap_or(0)));
                }
            }
            summary
        } else {
            "(failed to list files)".to_string()
        }
    } else {
        "(failed to resolve project folder)".to_string()
    };

    let skills_list = crate::plugins::list_local_skills_internal(db).unwrap_or_default();
    let iterate_resp: SidecarIterateResponse = sidecar_post(
        "/task/iterate",
        &serde_json::json!({
            "prompt": prompt,
            "plan": plan,
            "steps": steps,
            "messages": messages,
            "iteration": iteration,
            "projectId": project_id,
            "taskId": task_id,
            "providerId": chat.provider_id,
            "modelId": chat.model_id,
            "credentials": chat.credentials,
            "workspaceFiles": files_summary,
            "skills": skills_list,
        }),
    )
    .await?;

    if let Some(ref usage) = iterate_resp.usage {
        let provider_id = &chat.provider_id;
        let model_id = &chat.model_id;
        let (input_rate, output_rate) =
            crate::pricing::pricing_for_model(db, provider_id, model_id).unwrap_or((None, None));
        let estimated = crate::pricing::estimate_cost(
            usage.input_tokens.unwrap_or(0),
            usage.output_tokens.unwrap_or(0),
            input_rate,
            output_rate,
        );
        let _ = crate::agent::record_usage(
            db,
            Some(&project_id),
            provider_id,
            model_id,
            usage.input_tokens,
            usage.output_tokens,
            estimated,
            "coding",
        );
    }

    let mut new_messages: Vec<TaskMessage> = Vec::new();
    let mut new_steps: Vec<TaskStep> = Vec::new();
    let mut new_modified: Vec<String> = Vec::new();
    let mut pending_permission_id: Option<String> = None;
    let mut pending_edit_id: Option<String> = None;
    let mut wait_state: Option<TaskState> = None;

    let mut tool_calls = iterate_resp.tool_calls.clone();
    let mut assistant_content = iterate_resp.content.clone();

    if tool_calls.is_none() {
        let raw = assistant_content
            .as_deref()
            .or(iterate_resp.summary.as_deref())
            .unwrap_or("");
        if raw.contains("```") {
            let writes = extract_markdown_writes(raw, &prompt);
            if !writes.is_empty() {
                let paths: Vec<String> = writes.iter().map(|(p, _)| p.clone()).collect();
                assistant_content = Some(brief_write_status(&paths));
                tool_calls = Some(
                    writes
                        .into_iter()
                        .enumerate()
                        .map(|(i, (path, content))| SidecarToolCall {
                            id: (i + 1).to_string(),
                            name: "write_file".into(),
                            arguments: serde_json::json!({ "path": path, "content": content }),
                        })
                        .collect(),
                );
            }
        }
    }

    if let Some(ref role) = iterate_resp.role {
        if let Some(content) = assistant_content.as_ref() {
            let display = strip_code_fences(content);
            if !display.is_empty() {
                new_messages.push(TaskMessage {
                    role: "assistant".into(),
                    content: display,
                    agent_role: Some(role.clone()),
                });
            }
        }
    }

    if let Some(ref tool_calls) = tool_calls {
        for tc in tool_calls {
            let mut step = TaskStep {
                title: format!("Tool: {}", tc.name),
                role: iterate_resp.role.clone(),
                status: "running".into(),
                tool: Some(tc.name.clone()),
                tool_ok: None,
                output: None,
            };

            match execute_tool(&db, &project_id, Some(&task_id), &tc).await {
                Ok(output) => {
                    step.status = "done".into();
                    step.tool_ok = Some(true);
                    step.output = Some(output.chars().take(500).collect());
                    new_messages.push(TaskMessage {
                        role: "tool".into(),
                        content: output,
                        agent_role: Some("system".into()),
                    });
                    if tc.name == "write_file" {
                        if let Some(path) = tc.arguments.get("path").and_then(|v| v.as_str()) {
                            new_modified.push(path.to_string());
                        }
                    }
                }
                Err(e) if e.starts_with("permission_required:") => {
                    pending_permission_id = Some(e.replace("permission_required:", ""));
                    wait_state = Some(TaskState::WaitingForApproval);
                    step.status = "block".into();
                    step.tool_ok = Some(false);
                    step.output = Some("Waiting for permission".into());
                    new_steps.push(step);
                    break;
                }
                Err(e) if e.starts_with("Pending edit approval required:") => {
                    let edit_id = e
                        .trim_start_matches("Pending edit approval required:")
                        .trim()
                        .to_string();
                    pending_edit_id = Some(edit_id);
                    wait_state = Some(TaskState::WaitingForApproval);
                    step.status = "block".into();
                    step.tool_ok = Some(false);
                    step.output = Some("Waiting for edit approval".into());
                    new_steps.push(step);
                    break;
                }
                Err(e) if e.contains("workspace unavailable")
                    || e.contains("browser unavailable")
                    || e.contains("plugins unavailable") => {
                    wait_state = Some(TaskState::Blocked);
                    step.status = "block".into();
                    step.tool_ok = Some(false);
                    step.output = Some(e.clone());
                    new_messages.push(TaskMessage {
                        role: "tool".into(),
                        content: format!("Error: {e}"),
                        agent_role: Some("system".into()),
                    });
                    new_steps.push(step);
                    break;
                }
                Err(e) => {
                    step.status = "block".into();
                    step.tool_ok = Some(false);
                    step.output = Some(e.clone());
                    new_messages.push(TaskMessage {
                        role: "tool".into(),
                        content: format!("Error: {e}"),
                        agent_role: Some("system".into()),
                    });
                }
            }
            new_steps.push(step);
        }
    }

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut task = load_task(&conn, &task_id)?;
    task.iteration += 1;
    task.messages.extend(new_messages);
    task.steps.extend(new_steps);
    let wants_complete =
        iterate_resp.complete.unwrap_or(false) || iterate_resp.response_type == "complete";
    let wrote_this_round = !new_modified.is_empty();

    for path in new_modified {
        if !task.modified_files.contains(&path) {
            task.modified_files.push(path);
        }
    }
    if let Some(pid) = pending_permission_id {
        task.pending_permission_id = Some(pid);
    }
    if let Some(eid) = pending_edit_id {
        task.pending_edit_id = Some(eid);
    }
    if let Some(ws) = wait_state {
        task.state = ws.as_str().into();
        if ws == TaskState::Blocked {
            task.error = task
                .steps
                .last()
                .and_then(|s| s.output.clone())
                .or_else(|| Some("Task blocked.".into()));
        }
        save_task(&conn, &task)?;
        return load_task(&conn, &task_id);
    }

    let already_wrote = !task.modified_files.is_empty() || wrote_this_round;
    let has_no_tools = match &tool_calls {
        None => true,
        Some(v) => v.is_empty(),
    };

    if wants_complete && is_file_task_prompt(&prompt) && !already_wrote {
        task.state = TaskState::Paused.as_str().into();
    } else if wants_complete {
        task.state = TaskState::Completed.as_str().into();
        task.summary = iterate_resp
            .summary
            .or_else(|| assistant_content.clone())
            .map(|s| strip_code_fences(&s));
    } else if iterate_resp.response_type == "message" && has_no_tools {
        task.state = TaskState::Paused.as_str().into();
    } else if iterate_resp.response_type == "blocked" {
        task.state = TaskState::Blocked.as_str().into();
        task.error = iterate_resp
            .summary
            .clone()
            .or_else(|| assistant_content.clone())
            .map(|s| strip_code_fences(&s));
    }

    save_task(&conn, &task)?;
    load_task(&conn, &task_id)
}

async fn execute_tool(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    tc: &SidecarToolCall,
) -> Result<String, String> {
    match tc.name.as_str() {
        "skill" => {
            let skill_name = tc
                .arguments
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing name")?;
            let skills = crate::plugins::list_local_skills_internal(db)?;
            let found = skills
                .iter()
                .find(|s| s.name.eq_ignore_ascii_case(skill_name))
                .ok_or_else(|| format!("Skill not found: {skill_name}"))?;
            Ok(found.prompt.clone())
        }
        "read_file" => {
            let path = tc
                .arguments
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing path")?;
            let content = tool_read_file(db, project_id, task_id, path)?;
            Ok(content.chars().take(8000).collect())
        }
        "write_file" => {
            let path = tc
                .arguments
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing path")?;
            let content = tc
                .arguments
                .get("content")
                .and_then(|v| v.as_str())
                .ok_or("Missing content")?;
            let edit = tool_write_file(db, project_id, task_id, path, content)?;
            if edit.status == "pending" {
                return Err(format!("Pending edit approval required: {}", edit.id));
            }
            Ok(format!("Wrote {path}"))
        }
        "search_files" => {
            let query = tc
                .arguments
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or("Missing query")?;
            let matches = tool_search_files(db, project_id, query)?;
            Ok(serde_json::to_string(&matches).unwrap_or_else(|_| "[]".into()))
        }
        "git_status" => {
            let status: GitStatusResult = tool_git_status(db, project_id)?;
            Ok(serde_json::to_string(&status).unwrap_or_else(|_| "{}".into()))
        }
        "git_diff" => {
            let path = tc.arguments.get("path").and_then(|v| v.as_str());
            let diff = tool_git_diff(db, project_id, path)?;
            Ok(diff.chars().take(8000).collect())
        }
        "run_shell" => {
            let command = tc
                .arguments
                .get("command")
                .and_then(|v| v.as_str())
                .ok_or("Missing command")?;
            let payload = serde_json::to_value(tc).ok();
            tool_run_shell(db, project_id, task_id, command, payload).await
        }
        "browse_url" => {
            let url = tc
                .arguments
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing url")?;
            let extract = tc.arguments.get("extract").and_then(|v| v.as_str());
            let payload = serde_json::to_value(tc).ok();
            tool_browse_url(db, project_id, task_id, url, extract, payload).await
        }
        "plugin_tool" => {
            let plugin_id = tc
                .arguments
                .get("pluginId")
                .and_then(|v| v.as_str())
                .ok_or("Missing pluginId")?;
            let tool_id = tc
                .arguments
                .get("toolId")
                .and_then(|v| v.as_str())
                .ok_or("Missing toolId")?;
            let arguments = tc
                .arguments
                .get("arguments")
                .cloned()
                .unwrap_or(serde_json::json!({}));
            let payload = serde_json::to_value(tc).ok();
            tool_plugin_call(db, project_id, task_id, plugin_id, tool_id, &arguments, payload).await
        }
        "mcp_tool" => {
            let server_id = tc
                .arguments
                .get("serverId")
                .and_then(|v| v.as_str())
                .ok_or("Missing serverId")?;
            let tool_name = tc
                .arguments
                .get("toolName")
                .and_then(|v| v.as_str())
                .ok_or("Missing toolName")?;
            let arguments = tc
                .arguments
                .get("arguments")
                .cloned()
                .unwrap_or(serde_json::json!({}));
            let payload = serde_json::to_value(tc).ok();
            tool_mcp_call(db, project_id, task_id, server_id, tool_name, &arguments, payload).await
        }
        "computer_list_windows" => {
            tool_computer_list_windows(db, project_id, task_id).await
        }
        "computer_screenshot" => {
            let window_id = tc.arguments.get("windowId").and_then(|v| v.as_str());
            let process_name = tc.arguments.get("processName").and_then(|v| v.as_str());
            let title = tc.arguments.get("title").and_then(|v| v.as_str());
            let payload = serde_json::to_value(tc).ok();
            tool_computer_screenshot(
                db,
                project_id,
                task_id,
                window_id,
                process_name,
                title,
                payload,
            )
            .await
        }
        "computer_click" => {
            let x = tc.arguments.get("x").and_then(|v| v.as_i64()).ok_or("Missing x")?;
            let y = tc.arguments.get("y").and_then(|v| v.as_i64()).ok_or("Missing y")?;
            let process_name = tc
                .arguments
                .get("processName")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let title = tc
                .arguments
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let payload = serde_json::to_value(tc).ok();
            tool_computer_click(db, project_id, task_id, x, y, process_name, title, payload).await
        }
        "computer_type" => {
            let text = tc
                .arguments
                .get("text")
                .and_then(|v| v.as_str())
                .ok_or("Missing text")?;
            let process_name = tc
                .arguments
                .get("processName")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let title = tc
                .arguments
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let payload = serde_json::to_value(tc).ok();
            tool_computer_type(db, project_id, task_id, text, process_name, title, payload).await
        }
        "computer_focus" => {
            let window_id = tc
                .arguments
                .get("windowId")
                .and_then(|v| v.as_str())
                .ok_or("Missing windowId")?;
            let process_name = tc
                .arguments
                .get("processName")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let title = tc
                .arguments
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let payload = serde_json::to_value(tc).ok();
            tool_computer_focus(db, project_id, task_id, window_id, process_name, title, payload).await
        }
        _ => Err(format!("Unknown tool: {}", tc.name)),
    }
}

#[tauri::command]
pub fn pause_task(db: State<'_, DbState>, task_id: String) -> Result<TaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut task = load_task(&conn, &task_id)?;
    if task.state == TaskState::Running.as_str() {
        task.state = TaskState::Paused.as_str().into();
        save_task(&conn, &task)?;
    }
    load_task(&conn, &task_id)
}

#[tauri::command]
pub fn resume_task(db: State<'_, DbState>, task_id: String) -> Result<TaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut task = load_task(&conn, &task_id)?;
    if task.state == TaskState::Paused.as_str() {
        task.state = TaskState::Running.as_str().into();
        save_task(&conn, &task)?;
    }
    load_task(&conn, &task_id)
}

#[tauri::command]
pub fn cancel_task(db: State<'_, DbState>, task_id: String) -> Result<TaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut task = load_task(&conn, &task_id)?;
    task.state = TaskState::Cancelled.as_str().into();
    save_task(&conn, &task)?;
    load_task(&conn, &task_id)
}

#[tauri::command]
pub async fn resume_after_permission(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    permission_id: String,
    decision: String,
) -> Result<TaskRecord, String> {
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        resolve_permission_in_conn(
            &conn,
            &ResolvePermissionInput {
                permission_id: permission_id.clone(),
                decision: decision.clone(),
            },
        )?;
    }

    if decision == "deny" {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let task_id: Option<String> = conn
            .query_row(
                "SELECT task_id FROM pending_permissions WHERE id = ?1",
                params![permission_id],
                |row| row.get(0),
            )
            .ok();
        if let Some(tid) = task_id {
            let mut task = load_task(&conn, &tid)?;
            task.state = TaskState::Blocked.as_str().into();
            task.pending_permission_id = None;
            task.error = Some("Permission denied by user.".into());
            save_task(&conn, &task)?;
            return load_task(&conn, &tid);
        }
        return Err("No task linked to permission.".into());
    }

    let (task_id, payload) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT task_id, payload FROM pending_permissions WHERE id = ?1",
            params![permission_id],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .map_err(|_| "Permission not found.".to_string())?
    };

    let task_id = task_id.ok_or("No task linked.")?;
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut task = load_task(&conn, &task_id)?;
        task.pending_permission_id = None;
        task.state = TaskState::Running.as_str().into();
        save_task(&conn, &task)?;
    }

    if let Some(payload_str) = payload {
        if let Ok(tc) = serde_json::from_str::<SidecarToolCall>(&payload_str) {
            let project_id = {
                let conn = db.0.lock().map_err(|e| e.to_string())?;
                load_task(&conn, &task_id)?.project_id
            };
            if let Ok(out) = execute_tool(&db, &project_id, Some(&task_id), &tc).await {
                let conn = db.0.lock().map_err(|e| e.to_string())?;
                let mut task = load_task(&conn, &task_id)?;
                task.messages.push(TaskMessage {
                    role: "tool".into(),
                    content: out,
                    agent_role: Some("system".into()),
                });
                save_task(&conn, &task)?;
            }
        }
    }

    advance_task(db, vault, task_id).await
}

#[tauri::command]
pub async fn get_task_stream_text(task_id: String) -> Result<String, String> {
    sidecar_get_text(&format!("/task/stream?taskId={task_id}")).await
}

#[tauri::command]
pub async fn resume_after_edit(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    edit_id: String,
) -> Result<TaskRecord, String> {
    let (task_id, file_path) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT task_id, file_path FROM pending_edits WHERE id = ?1",
            params![edit_id],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?)),
        )
        .map_err(|_| "Pending edit not found.".to_string())?
    };

    let task_id = task_id.ok_or("No task linked to this edit.")?;
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut task = load_task(&conn, &task_id)?;
        task.pending_edit_id = None;
        task.state = TaskState::Running.as_str().into();
        task.messages.push(TaskMessage {
            role: "tool".into(),
            content: format!("User approved write to {file_path}"),
            agent_role: Some("system".into()),
        });
        if !task.modified_files.contains(&file_path) {
            task.modified_files.push(file_path);
        }
        save_task(&conn, &task)?;
    }

    advance_task(db, vault, task_id).await
}

#[tauri::command]
pub async fn send_task_message(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    task_id: String,
    content: String,
) -> Result<TaskRecord, String> {
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut task = load_task(&conn, &task_id)?;
        task.messages.push(TaskMessage {
            role: "user".into(),
            content: content.trim().to_string(),
            agent_role: None,
        });
        task.state = TaskState::Running.as_str().into();
        save_task(&conn, &task)?;
    }
    advance_task(db, vault, task_id).await
}
