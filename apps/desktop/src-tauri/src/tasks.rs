use crate::task_writes::{
    is_file_task_prompt, strip_code_fences,
};
use crate::agent::{
    build_task_chat_bundle, enabled_providers, record_usage, sidecar_get_text, sidecar_post,
    ChatResult, RunChatInput,
};
use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::files::{
    project_folder, tool_delete_file, tool_glob_files, tool_grep_files, tool_read_file_window,
    tool_replace_in_file, tool_search_files, tool_write_file,
};
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
use tauri::{AppHandle, Emitter, State};

const MAX_ITERATIONS: u32 = 20;
const MAX_CHAT_AGENT_ITERATIONS: u32 = 8;

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
    pub id: Option<String>,
    pub title: String,
    pub subtitle: Option<String>,
    pub role: Option<String>,
    pub status: Option<String>,
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
    pub active_agent: Option<String>,
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
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN active_agent TEXT", []);
    Ok(())
}

fn load_task(conn: &Connection, id: &str) -> Result<TaskRecord, String> {
    conn.query_row(
        "SELECT id, project_id, title, prompt, state, plan_json, steps_json, messages_json,
                plan_approved, iteration, summary, modified_files_json, pending_permission_id,
                pending_edit_id, error, scheduled_task_id, provider_id, model_id, created_at, updated_at, active_agent
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
                active_agent: row.get(20)?,
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
         model_id = ?14, updated_at = ?15, active_agent = ?16
         WHERE id = ?17",
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
            task.active_agent,
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
        "INSERT INTO tasks (id, project_id, title, prompt, state, created_at, updated_at, active_agent)
         VALUES (?1, ?2, ?3, ?4, 'draft', ?5, ?6, 'general')",
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
    #[serde(rename = "cacheReadTokens")]
    cache_read_tokens: Option<u64>,
    #[serde(rename = "cacheWriteTokens")]
    cache_write_tokens: Option<u64>,
    #[serde(rename = "estimatedCostUsd")]
    estimated_cost_usd: Option<f64>,
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
    active_agent: Option<String>,
) -> Result<TaskRecord, String> {
    start_task_inner(&db, &vault, &task_id, preferred_provider, preferred_model, active_agent).await
}

pub async fn start_task_inner(
    db: &DbState,
    vault: &VaultHandle,
    task_id: &str,
    preferred_provider: Option<String>,
    preferred_model: Option<String>,
    active_agent: Option<String>,
) -> Result<TaskRecord, String> {
    let (prompt, project_id) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut task = load_task(&conn, &task_id)?;
        if task.state != TaskState::Draft.as_str() && task.state != TaskState::Planning.as_str() {
            return Err("Task already started.".into());
        }
        if let Some(ref agent) = active_agent {
            task.active_agent = Some(agent.clone());
            save_task(&conn, &task)?;
        }
        (task.prompt.clone(), task.project_id.clone())
    };

    let allowed = enabled_providers(&db, &vault)?;
    if allowed.is_empty() {
        return Err("Enable at least one provider.".into());
    }

    let agent_name = active_agent.unwrap_or_else(|| "general".to_string());
    let chat = build_task_chat_bundle(
        &db,
        &vault,
        &allowed,
        &agent_name,
        preferred_provider.as_deref(),
        preferred_model.as_deref(),
        None,
        None,
    )
    .await?;
    let project_path = project_folder(&db, &project_id).unwrap_or_default();
    let plan_resp: SidecarPlanResponse = sidecar_post(
        "/task/plan",
        &serde_json::json!({
            "prompt": prompt,
            "projectId": project_id,
            "projectPath": project_path,
            "providerId": chat.provider_id,
            "modelId": chat.model_id,
            "credentials": chat.credentials,
            "activeAgent": agent_name,
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
            id: None,
            title: s.title,
            subtitle: s.subtitle,
            role: s.role,
            status: None,
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
    app: AppHandle,
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    task_id: String,
) -> Result<TaskRecord, String> {
    advance_task_inner(&db, &vault, &task_id, Some(&app)).await
}

fn workspace_files_summary(db: &DbState, project_id: &str, depth: u32, limit: usize) -> String {
    let Ok(root) = crate::files::project_folder(db, project_id) else {
        return "(failed to resolve project folder)".to_string();
    };
    let Ok(list) = crate::files::list_dir_internal(&root, None, depth) else {
        return "(failed to list files)".to_string();
    };
    let mut summary = String::new();
    for f in list.iter().take(limit) {
        if f.is_dir {
            summary.push_str(&format!("Directory: {}\n", f.path));
        } else {
            summary.push_str(&format!(
                "File: {} ({} bytes)\n",
                f.path,
                f.size.unwrap_or(0)
            ));
        }
    }
    summary
}

fn response_language_for_prompt(prompt: &str) -> &'static str {
    if prompt.chars().any(|ch| ('\u{0600}'..='\u{06ff}').contains(&ch)) {
        "Arabic"
    } else {
        "the same language as the user's latest message"
    }
}

pub async fn advance_task_inner(
    db: &DbState,
    vault: &VaultHandle,
    task_id: &str,
    app: Option<&AppHandle>,
) -> Result<TaskRecord, String> {
    let (state, iteration, project_id, prompt, plan, steps, messages, plan_approved, provider_id, model_id, active_agent) = {
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
            task.active_agent.clone(),
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
    let agent_name = active_agent.unwrap_or_else(|| "coding".to_string());
    let chat = build_task_chat_bundle(
        &db,
        &vault,
        &allowed,
        &agent_name,
        None,
        None,
        provider_id.as_deref(),
        model_id.as_deref(),
    )
    .await?;

    let files_summary = workspace_files_summary(db, &project_id, 5, 150);

    let skills_list = crate::plugins::list_local_skills_internal(db).unwrap_or_default();
    let project_path = project_folder(db, &project_id).unwrap_or_default();
    let iterate_resp: SidecarIterateResponse = sidecar_post(
        "/task/iterate",
        &serde_json::json!({
            "prompt": prompt,
            "plan": plan,
            "steps": steps,
            "messages": messages,
            "iteration": iteration,
            "projectId": project_id,
            "projectPath": project_path,
            "taskId": task_id,
            "providerId": chat.provider_id,
            "modelId": chat.model_id,
            "credentials": chat.credentials,
            "workspaceFiles": files_summary,
            "skills": skills_list,
            "activeAgent": agent_name,
        }),
    )
    .await?;

    if let Some(ref usage) = iterate_resp.usage {
        let provider_id = &chat.provider_id;
        let model_id = &chat.model_id;
        let (input_rate, output_rate, cache_read_rate, cache_write_rate) =
            crate::pricing::pricing_for_model(db, provider_id, model_id)
                .unwrap_or((None, None, None, None));
        let estimated = usage.estimated_cost_usd.or_else(|| {
            crate::pricing::estimate_cost_with_cache(
                usage.input_tokens.unwrap_or(0),
                usage.output_tokens.unwrap_or(0),
                usage.cache_read_tokens.unwrap_or(0),
                usage.cache_write_tokens.unwrap_or(0),
                input_rate,
                output_rate,
                cache_read_rate,
                cache_write_rate,
            )
        });
        let _ = crate::agent::record_usage(
            db,
            Some(&project_id),
            provider_id,
            model_id,
            usage.input_tokens,
            usage.output_tokens,
            usage.cache_read_tokens,
            usage.cache_write_tokens,
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

    let tool_calls = iterate_resp.tool_calls.clone();
    let assistant_content = iterate_resp.content.clone();

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

            match execute_tool(&db, &project_id, Some(&task_id), &tc, app).await {
                Ok(output) => {
                    step.status = "done".into();
                    step.tool_ok = Some(true);
                    step.output = Some(output.chars().take(500).collect());
                    new_messages.push(TaskMessage {
                        role: "tool".into(),
                        content: output,
                        agent_role: Some("system".into()),
                    });
                    if tc.name == "write_file" || tc.name == "delete_file" || tc.name == "replace_in_file" {
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
    app: Option<&AppHandle>,
) -> Result<String, String> {
    let res = execute_tool_inner(db, project_id, task_id, tc, app).await;
    if let Err(ref e) = res {
        if e.starts_with("permission_required:") {
            let pending_id = e.replace("permission_required:", "");
            if let Ok(conn) = db.0.lock() {
                if let Ok(payload_str) = serde_json::to_string(tc) {
                    let _ = conn.execute(
                        "UPDATE pending_permissions SET payload = ?1 WHERE id = ?2",
                        params![payload_str, pending_id],
                    );
                }
            }
        }
    }
    res
}

async fn execute_tool_inner(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    tc: &SidecarToolCall,
    app: Option<&AppHandle>,
) -> Result<String, String> {
    match tc.name.as_str() {
        "todo_write" => {
            let todos_val = tc.arguments.get("todos").ok_or("Missing todos")?;
            let merge = tc.arguments.get("merge").and_then(|v| v.as_bool()).unwrap_or(true);
            let mut incoming_steps: Vec<PlanStep> = Vec::new();
            if let Some(arr) = todos_val.as_array() {
                for item in arr {
                    let id = item.get("id").and_then(|v| v.as_str()).map(String::from);
                    let content = item.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let status = item.get("status").and_then(|v| v.as_str()).unwrap_or("pending").to_string();
                    incoming_steps.push(PlanStep {
                        id,
                        title: content,
                        subtitle: None,
                        role: None,
                        status: Some(status),
                    });
                }
            } else {
                return Err("todos must be an array".into());
            }

            if let Some(t_id) = task_id {
                let conn = db.0.lock().map_err(|e| e.to_string())?;
                let mut task = load_task(&conn, t_id)?;
                if merge {
                    for incoming in incoming_steps {
                        if let Some(ref incoming_id) = incoming.id {
                            if let Some(existing) = task.plan.iter_mut().find(|s| s.id.as_ref() == Some(incoming_id)) {
                                existing.title = incoming.title;
                                existing.status = incoming.status;
                            } else {
                                task.plan.push(incoming);
                            }
                        } else {
                            task.plan.push(incoming);
                        }
                    }
                } else {
                    task.plan = incoming_steps;
                }
                save_task(&conn, &task)?;
                if let Some(app) = app {
                    let _ = app.emit("aura://task-update", task);
                }
                Ok("Task todo list updated successfully.".into())
            } else {
                Err("No active task ID provided.".into())
            }
        }
        "start_server" => {
            let port = tc.arguments.get("port").and_then(|v| v.as_u64()).ok_or("Missing port")? as u16;
            let command = tc.arguments.get("command").and_then(|v| v.as_str()).ok_or("Missing command")?;
            let composite_cmd = format!(
                "lsof -t -i:{} | xargs kill -9 2>/dev/null || true; nohup {} > /tmp/server_{}.log 2>&1 & \
                 for i in {{1..10}}; do \
                     if lsof -i:{} >/dev/null 2>&1; then \
                         echo \"SERVER_READY\"; \
                         exit 0; \
                     fi; \
                     sleep 1; \
                 done; \
                 echo \"SERVER_FAILED\"; \
                 cat /tmp/server_{}.log | tail -n 20; \
                 exit 1;",
                port, command, port, port, port
            );
            let payload = serde_json::to_value(tc).ok();
            crate::vm::tool_run_shell(db, project_id, task_id, &composite_cmd, payload).await
        }
        "schedule_cron" => {
            let cron = tc.arguments.get("cron").and_then(|v| v.as_str()).ok_or("Missing cron")?;
            let command = tc.arguments.get("command").and_then(|v| v.as_str()).ok_or("Missing command")?;
            let conn = db.0.lock().map_err(|e| e.to_string())?;
            let id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Utc::now().to_rfc3339();
            let cadence = crate::scheduled::ScheduledCadence {
                kind: "cron".into(),
                cron: Some(cron.to_string()),
                hour: None,
                minute: None,
                day_of_week: None,
            };
            let permissions = vec![
                crate::permissions::PermissionProfileGrant {
                    category: "file".into(),
                    action: "read".into(),
                    target_pattern: "*".into(),
                },
                crate::permissions::PermissionProfileGrant {
                    category: "file".into(),
                    action: "write".into(),
                    target_pattern: "*".into(),
                },
                crate::permissions::PermissionProfileGrant {
                    category: "shell".into(),
                    action: "run".into(),
                    target_pattern: "*".into(),
                },
            ];
            conn.execute(
                "INSERT INTO scheduled_tasks
                 (id, name, description, prompt, project_id, routing_policy, cadence_json, permission_profile_json,
                  paused, last_run_at, next_run_at, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,NULL,?6,?7,0,NULL,?8,?9,?10)",
                params![
                    id,
                    format!("Cron: {}", command.chars().take(30).collect::<String>()),
                    Some(format!("Scheduled command: {}", command)),
                    format!("Run shell command: {}", command),
                    project_id,
                    serde_json::to_string(&cadence).unwrap_or_default(),
                    serde_json::to_string(&permissions).unwrap_or_default(),
                    now,
                    now,
                    now,
                ],
            )
            .map_err(|e| e.to_string())?;
            Ok(format!("Successfully scheduled cron task with ID {}", id))
        }
        "list_external_tools" => {
            let tools = crate::extensions_helper::get_all_tools_remote(Some(project_id)).await?;
            Ok(serde_json::to_string(&tools).unwrap_or_else(|_| "{}".into()))
        }
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
            let offset = tc
                .arguments
                .get("offset")
                .and_then(|v| v.as_u64())
                .map(|v| v.min(u32::MAX as u64) as u32);
            let limit = tc
                .arguments
                .get("limit")
                .and_then(|v| v.as_u64())
                .map(|v| v.min(u32::MAX as u64) as u32);
            let window = tool_read_file_window(db, project_id, task_id, path, offset, limit)?;
            Ok(serde_json::to_string(&window).unwrap_or_else(|_| window.content))
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
        "replace_in_file" => {
            let path = tc
                .arguments
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing path")?;
            let old_text = tc
                .arguments
                .get("oldText")
                .and_then(|v| v.as_str())
                .ok_or("Missing oldText")?;
            let new_text = tc
                .arguments
                .get("newText")
                .and_then(|v| v.as_str())
                .ok_or("Missing newText")?;
            let replace_all = tc
                .arguments
                .get("replaceAll")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let edit = tool_replace_in_file(
                db,
                project_id,
                task_id,
                path,
                old_text,
                new_text,
                replace_all,
            )?;
            if edit.status == "pending" {
                return Err(format!("Pending edit approval required: {}", edit.id));
            }
            Ok(format!("Edited {path}"))
        }
        "delete_file" => {
            let path = tc
                .arguments
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing path")?;
            tool_delete_file(db, project_id, task_id, path)?;
            Ok(format!("Deleted {path}"))
        }
        "set_theme" => {
            let theme = tc
                .arguments
                .get("theme")
                .and_then(|v| v.as_str())
                .ok_or("Missing theme")?;
            let allowed = [
                "system",
                "light",
                "dark",
                "amoled",
                "blue",
                "high-contrast",
                "cyberpunk",
                "forest",
                "pastel",
                "sunset",
                "sepia",
                "nord",
                "dracula",
                "matrix",
                "sakura",
                "sakura-dark",
                "coffee",
                "ocean",
                "luxury",
                "emerald-luxury",
                "rose-luxury",
                "velvet-luxury",
                "bronze-luxury",
                "platinum-luxury",
                "crimson-luxury",
                "sapphire-luxury",
                "amethyst-luxury",
                "amber-luxury",
                "obsidian-gold",
                "pearl-noir",
                "jade-silk",
                "arctic-glass",
                "royal-indigo",
                "copper-olive",
                "moonlit-rose",
                "carbon-teal",
            ];
            if !allowed.contains(&theme) {
                return Err("Invalid theme.".into());
            }
            {
                let conn = db.0.lock().map_err(|e| e.to_string())?;
                conn.execute(
                    "INSERT INTO app_settings (key, value) VALUES ('theme_preference', ?1)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    params![theme],
                )
                .map_err(|e| e.to_string())?;
            }
            if let Some(app) = app {
                let _ = app.emit("aura://theme-preference", theme);
            }
            Ok(format!("Theme set to {theme}"))
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
        "glob_files" => {
            let pattern = tc
                .arguments
                .get("pattern")
                .and_then(|v| v.as_str())
                .ok_or("Missing pattern")?;
            let matches = tool_glob_files(db, project_id, pattern)?;
            Ok(serde_json::to_string(&matches).unwrap_or_else(|_| "[]".into()))
        }
        "grep_files" => {
            let pattern = tc
                .arguments
                .get("pattern")
                .and_then(|v| v.as_str())
                .ok_or("Missing pattern")?;
            let path = tc.arguments.get("path").and_then(|v| v.as_str());
            let include = tc.arguments.get("include").and_then(|v| v.as_str());
            let matches = tool_grep_files(db, project_id, pattern, path, include)?;
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
        _ => {
            if let Some(output) = execute_universal_workspace_tool(db, project_id, task_id, tc, app).await? {
                Ok(output)
            } else {
                #[derive(Debug, Deserialize)]
                struct SidecarToolExecuteResponse {
                    output: Option<String>,
                    error: Option<String>,
                }

                let project_path = project_folder(db, project_id).unwrap_or_default();
                let resp_res: Result<SidecarToolExecuteResponse, String> = crate::agent::sidecar_post(
                    "/tools/execute",
                    &serde_json::json!({
                        "name": tc.name,
                        "arguments": tc.arguments,
                        "projectId": project_id,
                        "projectPath": project_path,
                        "taskId": task_id,
                    }),
                )
                .await;

                match resp_res {
                    Ok(resp) => {
                        if let Some(err) = resp.error {
                            Err(err)
                        } else if let Some(output) = resp.output {
                            Ok(output)
                        } else {
                            Err(format!("Unknown tool: {}", tc.name))
                        }
                    }
                    Err(e) => {
                        if e.contains("404") || e.contains("Not found") || e.contains("Unknown tool") {
                            Err(format!("Unknown tool: {}", tc.name))
                        } else {
                            Err(format!("Custom tool execution failed: {}", e))
                        }
                    }
                }
            }
        }
    }
}

const UNIVERSAL_WRITE_TOOLS: &[&str] = &[
    "artifact_create",
    "artifact_update",
    "artifact_version",
    "artifact_export",
    "document_create",
    "document_insert_paragraph",
    "document_insert_heading",
    "document_insert_table",
    "document_format_styles",
    "document_add_comment",
    "document_reply_comment",
    "document_track_changes_on",
    "document_propose_edits",
    "document_accept_reject_changes",
    "document_export_docx",
    "document_export_pdf",
    "spreadsheet_create_workbook",
    "spreadsheet_create_sheet",
    "spreadsheet_rename_sheet",
    "spreadsheet_write_range",
    "spreadsheet_set_formula",
    "spreadsheet_copy_formula",
    "spreadsheet_format_range",
    "spreadsheet_autofit_columns",
    "spreadsheet_create_table",
    "spreadsheet_create_pivot_table",
    "spreadsheet_create_chart",
    "spreadsheet_sort_filter",
    "spreadsheet_add_dropdown",
    "spreadsheet_add_comment",
    "spreadsheet_export_xlsx",
    "spreadsheet_export_csv",
    "spreadsheet_export_pdf",
    "presentation_create_deck",
    "presentation_create_storyline",
    "presentation_add_slide",
    "presentation_edit_slide_text",
    "presentation_apply_theme",
    "presentation_insert_image",
    "presentation_create_chart",
    "presentation_create_diagram",
    "presentation_create_timeline",
    "presentation_create_process_flow",
    "presentation_reorder_slides",
    "presentation_export_pptx",
    "presentation_export_pdf",
    "pdf_summarize",
    "pdf_annotate",
    "pdf_convert_to_docx",
    "pdf_convert_to_xlsx",
    "pdf_convert_to_markdown",
    "pdf_export",
    "image_generate",
    "image_create_banner",
    "image_create_logo_concept",
    "image_create_icon",
    "image_export_svg",
    "design_create_html",
    "design_update_html",
    "design_export_image",
    "research_plan",
    "research_create_report",
    "citation_insert",
    "data_clean",
    "data_transform",
    "data_join",
    "data_groupby",
    "data_chart",
    "data_export_xlsx",
    "data_export_csv",
    "data_export_report",
    "database_export_csv",
    "database_export_xlsx",
    "database_create_report",
    "database_safe_migration_plan",
    "automation_create_task",
    "automation_schedule",
    "automation_monitor_condition",
    "automation_run_workflow",
    "github_issue_create",
    "github_pr_review",
    "notion_create_page",
];

const UNIVERSAL_READ_TOOLS: &[&str] = &[
    "artifact_preview",
    "artifact_share",
    "share_file",
    "create_download_link",
    "artifact_read_back",
    "artifact_verify",
    "document_open",
    "document_read_section",
    "document_verify",
    "spreadsheet_open_workbook",
    "spreadsheet_read_range",
    "spreadsheet_validate_formulas",
    "spreadsheet_find_errors",
    "spreadsheet_verify",
    "presentation_open_deck",
    "presentation_verify_layout",
    "presentation_verify_text_overflow",
    "presentation_verify_contrast",
    "presentation_verify",
    "pdf_read",
    "pdf_extract_text",
    "pdf_extract_tables",
    "pdf_verify",
    "design_preview",
    "design_verify",
    "data_profile",
    "data_detect_columns",
    "data_detect_missing_values",
    "data_detect_duplicates",
    "data_detect_anomalies",
    "data_statistics",
    "data_forecast",
    "database_schema_inspect",
    "database_query",
    "database_explain_query",
    "database_detect_sensitive_fields",
    "source_quality_check",
    "automation_list",
];

const UNIVERSAL_SEARCH_TOOLS: &[&str] = &[
    "document_search_text",
    "pdf_search",
    "web_search",
    "web_search_images",
    "web_search_videos",
    "web_search_academic",
    "web_search_shopping",
    "web_search_jobs",
];

const UNIVERSAL_BROWSER_TOOLS: &[&str] = &[
    "web_open",
    "web_extract",
    "web_compare_sources",
    "browser_open",
    "browser_read_page",
    "browser_extract_table",
    "browser_verify_page",
];

const UNIVERSAL_UNAVAILABLE_NATIVE_TOOLS: &[&str] = &[
    "pdf_extract_images",
    "pdf_split",
    "pdf_merge",
    "image_edit",
    "image_remove_background",
    "image_upscale",
    "image_crop_resize",
    "image_export_png",
    "browser_click",
    "browser_type",
    "browser_fill_form",
    "browser_screenshot",
    "browser_download_file",
    "automation_cancel",
    "email_search",
    "email_draft",
    "email_send_with_confirmation",
    "calendar_search",
    "calendar_create_event",
    "slack_search",
    "slack_send_with_confirmation",
];

async fn execute_universal_workspace_tool(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    tc: &SidecarToolCall,
    app: Option<&AppHandle>,
) -> Result<Option<String>, String> {
    let name = tc.name.as_str();

    if UNIVERSAL_WRITE_TOOLS.contains(&name) {
        let path = universal_output_path(db, project_id, name, &tc.arguments)?;
        let content = universal_output_content(name, &tc.arguments)?;
        let edit = tool_write_file(db, project_id, task_id, &path, &content)?;
        if edit.status == "pending" {
            return Err(format!("Pending edit approval required: {}", edit.id));
        }
        return Ok(Some(format!("Wrote {path} using {name}")));
    }

    if name == "document_replace_text" || name == "artifact_update_text" {
        let path = arg_str(&tc.arguments, &["path", "filePath", "documentPath"])
            .ok_or("Missing path")?;
        let old_text = arg_str(&tc.arguments, &["oldText", "find", "searchText"])
            .ok_or("Missing oldText")?;
        let new_text = arg_str(&tc.arguments, &["newText", "replacement", "replaceWith"])
            .ok_or("Missing newText")?;
        let replace_all = tc
            .arguments
            .get("replaceAll")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let edit = tool_replace_in_file(db, project_id, task_id, path, old_text, new_text, replace_all)?;
        if edit.status == "pending" {
            return Err(format!("Pending edit approval required: {}", edit.id));
        }
        return Ok(Some(format!("Edited {path} using {name}")));
    }

    if UNIVERSAL_READ_TOOLS.contains(&name) {
        if name.starts_with("database_") {
            return Ok(Some(handle_database_read_tool(db, project_id, task_id, name, &tc.arguments)?));
        }
        let path = arg_str(&tc.arguments, &["path", "filePath", "sourcePath", "documentPath", "workbookPath", "deckPath", "pdfPath"])
            .ok_or("Missing path")?;
        let window = tool_read_file_window(db, project_id, task_id, path, Some(1), Some(400))?;
        let mut output = serde_json::to_string(&window).unwrap_or_else(|_| window.content.clone());
        if name.starts_with("data_") || name.starts_with("spreadsheet_") {
            output = format!("{}\n\n{}", summarize_table_like_content(&window.content), output);
        }
        return Ok(Some(output));
    }

    if UNIVERSAL_SEARCH_TOOLS.contains(&name) {
        if let Some(url) = arg_str(&tc.arguments, &["url"]) {
            let extract = tc.arguments.get("extract").and_then(|v| v.as_str());
            let payload = serde_json::to_value(tc).ok();
            return Ok(Some(tool_browse_url(db, project_id, task_id, url, extract, payload).await?));
        }
        let query = arg_str(&tc.arguments, &["query", "pattern", "text", "searchText"])
            .ok_or("Missing query")?;
        let path = tc.arguments.get("path").and_then(|v| v.as_str());
        let matches = tool_grep_files(db, project_id, query, path, None)?;
        return Ok(Some(serde_json::to_string(&matches).unwrap_or_else(|_| "[]".into())));
    }

    if UNIVERSAL_BROWSER_TOOLS.contains(&name) {
        let url = arg_str(&tc.arguments, &["url"]).ok_or("Missing url")?;
        let extract = tc
            .arguments
            .get("extract")
            .and_then(|v| v.as_str())
            .or(Some(if name == "browser_extract_table" { "text" } else { "text" }));
        let payload = serde_json::to_value(tc).ok();
        return Ok(Some(tool_browse_url(db, project_id, task_id, url, extract, payload).await?));
    }

    if let Some(output) = execute_connector_alias_tool(db, project_id, task_id, tc, name).await? {
        return Ok(Some(output));
    }

    if UNIVERSAL_UNAVAILABLE_NATIVE_TOOLS.contains(&name) {
        return Err(format!(
            "{name} requires a native app, browser action, external connector, or image/PDF engine that is not configured in this project. Aura Work did not fake the result."
        ));
    }

    let _ = app;
    Ok(None)
}

async fn execute_connector_alias_tool(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    tc: &SidecarToolCall,
    name: &str,
) -> Result<Option<String>, String> {
    if let (Some(server_id), Some(tool_name)) = (
        arg_str(&tc.arguments, &["serverId", "mcpServerId"]),
        arg_str(&tc.arguments, &["toolName", "mcpToolName"]),
    ) {
        let arguments = tc
            .arguments
            .get("arguments")
            .cloned()
            .unwrap_or_else(|| serde_json::json!({}));
        let payload = serde_json::to_value(tc).ok();
        return Ok(Some(tool_mcp_call(db, project_id, task_id, server_id, tool_name, &arguments, payload).await?));
    }

    if let (Some(plugin_id), Some(tool_id)) = (
        arg_str(&tc.arguments, &["pluginId"]),
        arg_str(&tc.arguments, &["toolId"]),
    ) {
        let arguments = tc
            .arguments
            .get("arguments")
            .cloned()
            .unwrap_or_else(|| serde_json::json!({}));
        let payload = serde_json::to_value(tc).ok();
        return Ok(Some(tool_plugin_call(db, project_id, task_id, plugin_id, tool_id, &arguments, payload).await?));
    }

    if name.starts_with("email_")
        || name.starts_with("calendar_")
        || name.starts_with("slack_")
        || name.starts_with("github_")
        || name.starts_with("notion_")
    {
        return Err(format!(
            "{name} requires a configured MCP server or plugin. Pass serverId/toolName or pluginId/toolId; Aura Work will not perform external actions without an explicit connector."
        ));
    }

    Ok(None)
}

fn arg_str<'a>(args: &'a serde_json::Value, keys: &[&str]) -> Option<&'a str> {
    keys.iter().find_map(|key| args.get(*key).and_then(|v| v.as_str()))
}

fn universal_output_path(
    db: &DbState,
    project_id: &str,
    name: &str,
    args: &serde_json::Value,
) -> Result<String, String> {
    let mut resolved_path = if let Some(path) = arg_str(args, &["path", "filePath", "outputPath", "destination", "exportPath"]) {
        reject_native_output_without_engine(name, path)?;
        path.to_string()
    } else {
        let title = arg_str(args, &["title", "name", "artifactName"]).unwrap_or(name);
        let slug = slugify_file_stem(title);
        format!("{}.{}", slug, universal_default_extension(name, args))
    };

    if let Ok(root) = project_folder(db, project_id) {
        let path_buf = std::path::Path::new(&resolved_path);
        if let Some(parent) = path_buf.parent() {
            if parent != std::path::Path::new("") {
                let parent_str = parent.to_string_lossy().to_string();
                if parent_str == "artifacts" || parent_str == "data" || parent_str == "docs" || parent_str == "decks" || parent_str == "reports" {
                    let full_parent_path = std::path::Path::new(&root).join(parent);
                    if !full_parent_path.exists() {
                        if let Some(file_name) = path_buf.file_name() {
                            resolved_path = file_name.to_string_lossy().to_string();
                        }
                    }
                }
            }
        }
    }

    Ok(resolved_path)
}

fn reject_native_output_without_engine(name: &str, path: &str) -> Result<(), String> {
    let ext = path.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    if matches!(ext.as_str(), "docx" | "xlsx" | "pptx" | "pdf" | "png" | "jpg" | "jpeg" | "webp") {
        return Err(format!(
            "{name} cannot write native .{ext} output without a configured native exporter. Use an editable fallback path such as .md, .csv, .html, .svg, .json, .sql, or .txt."
        ));
    }
    Ok(())
}

fn universal_default_extension(name: &str, args: &serde_json::Value) -> &'static str {
    if let Some(format) = arg_str(args, &["format", "artifactType", "outputFormat"]) {
        let f = format.trim_start_matches('.').to_ascii_lowercase();
        match f.as_str() {
            "md" | "markdown" => return "md",
            "csv" => return "csv",
            "html" => return "html",
            "svg" => return "svg",
            "json" => return "json",
            "sql" => return "sql",
            "txt" => return "txt",
            _ => {}
        }
    }
    if name.starts_with("spreadsheet_") || name == "data_export_csv" {
        "csv"
    } else if name.starts_with("image_") && name != "image_create_banner" {
        "svg"
    } else if name.starts_with("design_") || name == "image_create_banner" {
        "html"
    } else if name.starts_with("automation_") {
        "json"
    } else if name.contains("migration") {
        "sql"
    } else {
        "md"
    }
}

fn universal_output_content(name: &str, args: &serde_json::Value) -> Result<String, String> {
    for key in ["content", "markdown", "csv", "html", "svg", "json", "sql", "text", "body", "report"] {
        if let Some(value) = args.get(key) {
            if let Some(s) = value.as_str() {
                if !s.trim().is_empty() {
                    return Ok(s.to_string());
                }
            } else {
                return serde_json::to_string_pretty(value).map_err(|e| e.to_string());
            }
        }
    }
    if let Some(rows) = args.get("rows").and_then(|v| v.as_array()) {
        if name.starts_with("spreadsheet_") || name.starts_with("data_") {
            return Ok(json_rows_to_csv(rows));
        }
    }
    if let Some(slides) = args.get("slides").and_then(|v| v.as_array()) {
        return Ok(slides_to_markdown(slides));
    }
    if name.starts_with("automation_") {
        return serde_json::to_string_pretty(args).map_err(|e| e.to_string());
    }
    Err("Missing content. Universal artifact tools require content, markdown, csv, html, svg, json, sql, rows, or slides.".into())
}

fn handle_database_read_tool(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    name: &str,
    args: &serde_json::Value,
) -> Result<String, String> {
    let path = arg_str(args, &["path", "databasePath", "sqlitePath", "filePath"])
        .ok_or("Missing database path")?;
    if name == "database_schema_inspect" || name == "database_detect_sensitive_fields" {
        let root = project_folder(db, project_id)?;
        let db_path = crate::files::resolve_project_path(&root, path)?;
        let conn = Connection::open(db_path).map_err(|e| format!("Open SQLite database failed: {e}"))?;
        return inspect_sqlite_schema(&conn, name == "database_detect_sensitive_fields");
    }
    if name == "database_query" || name == "database_explain_query" {
        let sql = arg_str(args, &["sql", "query"]).ok_or("Missing sql")?;
        if !is_read_only_sql(sql) {
            return Err("Only read-only SELECT/EXPLAIN SQLite queries are allowed through database_query.".into());
        }
        let root = project_folder(db, project_id)?;
        let db_path = crate::files::resolve_project_path(&root, path)?;
        let conn = Connection::open(db_path).map_err(|e| format!("Open SQLite database failed: {e}"))?;
        return run_sqlite_query_preview(&conn, sql);
    }
    let window = tool_read_file_window(db, project_id, task_id, path, Some(1), Some(300))?;
    Ok(serde_json::to_string(&window).unwrap_or_else(|_| window.content))
}

fn inspect_sqlite_schema(conn: &Connection, include_sensitive_scan: bool) -> Result<String, String> {
    let mut stmt = conn
        .prepare("SELECT name, sql FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        let (name, sql) = row.map_err(|e| e.to_string())?;
        let schema = sql.unwrap_or_default();
        let sensitive_hints = if include_sensitive_scan {
            sensitive_field_hints(&format!("{name}\n{schema}"))
        } else {
            Vec::<String>::new()
        };
        out.push(serde_json::json!({
            "name": name,
            "schema": schema,
            "sensitiveFieldHints": sensitive_hints,
        }));
    }
    serde_json::to_string_pretty(&out).map_err(|e| e.to_string())
}

fn run_sqlite_query_preview(conn: &Connection, sql: &str) -> Result<String, String> {
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let mut data = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut item = serde_json::Map::new();
        for (i, name) in column_names.iter().enumerate() {
            let value: rusqlite::types::Value = row.get(i).map_err(|e| e.to_string())?;
            item.insert(name.clone(), sqlite_value_to_json(value));
        }
        data.push(serde_json::Value::Object(item));
        if data.len() >= 100 {
            break;
        }
    }
    serde_json::to_string_pretty(&serde_json::json!({
        "columns": column_names,
        "rows": data,
        "truncated": data.len() >= 100
    })).map_err(|e| e.to_string())
}

fn sqlite_value_to_json(value: rusqlite::types::Value) -> serde_json::Value {
    match value {
        rusqlite::types::Value::Null => serde_json::Value::Null,
        rusqlite::types::Value::Integer(v) => serde_json::json!(v),
        rusqlite::types::Value::Real(v) => serde_json::json!(v),
        rusqlite::types::Value::Text(v) => serde_json::json!(v),
        rusqlite::types::Value::Blob(v) => serde_json::json!(format!("<{} bytes>", v.len())),
    }
}

fn is_read_only_sql(sql: &str) -> bool {
    let trimmed = sql.trim_start().to_ascii_lowercase();
    (trimmed.starts_with("select ") || trimmed.starts_with("with ") || trimmed.starts_with("explain "))
        && !trimmed.contains(';')
}

fn sensitive_field_hints(schema_text: &str) -> Vec<String> {
    let lower = schema_text.to_ascii_lowercase();
    ["password", "token", "secret", "key", "email", "phone", "ssn", "credit", "card"]
        .iter()
        .filter(|term| lower.contains(**term))
        .map(|term| term.to_string())
        .collect()
}

fn summarize_table_like_content(content: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let header = lines.first().copied().unwrap_or("");
    let delimiter = if header.contains('\t') { '\t' } else { ',' };
    let columns: Vec<&str> = header.split(delimiter).collect();
    let missing_cells = lines
        .iter()
        .skip(1)
        .flat_map(|line| line.split(delimiter))
        .filter(|cell| cell.trim().is_empty())
        .count();
    format!(
        "Table profile: rows={}, columns={}, missingCells={}",
        lines.len().saturating_sub(1),
        columns.len(),
        missing_cells
    )
}

fn json_rows_to_csv(rows: &[serde_json::Value]) -> String {
    let mut headers = Vec::<String>::new();
    for row in rows {
        if let Some(obj) = row.as_object() {
            for key in obj.keys() {
                if !headers.contains(key) {
                    headers.push(key.clone());
                }
            }
        }
    }
    let mut out = String::new();
    out.push_str(&headers.iter().map(|h| csv_escape(h)).collect::<Vec<_>>().join(","));
    for row in rows {
        out.push('\n');
        let values = headers.iter().map(|h| {
            row.get(h)
                .map(|v| v.as_str().map(str::to_string).unwrap_or_else(|| v.to_string()))
                .unwrap_or_default()
        });
        out.push_str(&values.map(|v| csv_escape(&v)).collect::<Vec<_>>().join(","));
    }
    out
}

fn slides_to_markdown(slides: &[serde_json::Value]) -> String {
    let mut out = String::from("# Slide Deck\n");
    for (idx, slide) in slides.iter().enumerate() {
        out.push_str(&format!("\n## Slide {}\n", idx + 1));
        if let Some(title) = slide.get("title").and_then(|v| v.as_str()) {
            out.push_str(&format!("\n### {title}\n"));
        }
        if let Some(body) = slide.get("body").and_then(|v| v.as_str()) {
            out.push_str(body);
            out.push('\n');
        }
        if let Some(points) = slide.get("bullets").and_then(|v| v.as_array()) {
            for point in points {
                out.push_str("- ");
                out.push_str(point.as_str().unwrap_or(&point.to_string()));
                out.push('\n');
            }
        }
    }
    out
}

fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn slugify_file_stem(input: &str) -> String {
    let mut out = String::new();
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        } else if ch.is_whitespace() || ch == '-' || ch == '_' {
            if !out.ends_with('-') {
                out.push('-');
            }
        }
    }
    let trimmed = out.trim_matches('-');
    if trimmed.is_empty() {
        "artifact".into()
    } else {
        trimmed.chars().take(64).collect()
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

fn add_one_shot_permission_grant(
    db: &DbState,
    permission_id: &str,
) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let (project_id, category, action, target): (String, String, String, String) = conn
        .query_row(
            "SELECT project_id, category, action, target FROM pending_permissions WHERE id = ?1",
            params![permission_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|_| "Permission not found.".to_string())?;
    let grant_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO project_permission_grants (id, project_id, category, action, target_pattern, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![grant_id, project_id, category, action, target, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(Some(grant_id))
}

fn remove_one_shot_permission_grant(db: &DbState, grant_id: Option<String>) {
    if let Some(grant_id) = grant_id {
        if let Ok(conn) = db.0.lock() {
            let _ = conn.execute(
                "DELETE FROM project_permission_grants WHERE id = ?1",
                params![grant_id],
            );
        }
    }
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
            let one_shot_grant = if decision == "allow-once" {
                add_one_shot_permission_grant(&db, &permission_id)?
            } else {
                None
            };
            if let Ok(out) = execute_tool(&db, &project_id, Some(&task_id), &tc, None).await {
                let conn = db.0.lock().map_err(|e| e.to_string())?;
                let mut task = load_task(&conn, &task_id)?;
                task.messages.push(TaskMessage {
                    role: "tool".into(),
                    content: out,
                    agent_role: Some("system".into()),
                });
                save_task(&conn, &task)?;
            }
            remove_one_shot_permission_grant(&db, one_shot_grant);
        }
    }

    advance_task_inner(&db, &vault, &task_id, None).await
}

#[tauri::command]
pub async fn resolve_workspace_permission(
    db: State<'_, DbState>,
    permission_id: String,
    decision: String,
) -> Result<String, String> {
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
        return Ok("Permission denied.".into());
    }

    let (project_id, payload) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT project_id, payload FROM pending_permissions WHERE id = ?1",
            params![permission_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .map_err(|_| "Permission not found.".to_string())?
    };

    let Some(payload_str) = payload else {
        return Ok("Permission resolved.".into());
    };
    let tc = serde_json::from_str::<SidecarToolCall>(&payload_str)
        .map_err(|_| "Permission payload is not a workspace tool call.".to_string())?;
    let one_shot_grant = if decision == "allow-once" {
        add_one_shot_permission_grant(&db, &permission_id)?
    } else {
        None
    };
    let result = execute_tool(&db, &project_id, None, &tc, None).await;
    remove_one_shot_permission_grant(&db, one_shot_grant);
    result
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

    advance_task_inner(&db, &vault, &task_id, None).await
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
    advance_task_inner(&db, &vault, &task_id, None).await
}

pub async fn run_workspace_chat_agent(
    db: &DbState,
    vault: &VaultHandle,
    input: &RunChatInput,
) -> Result<ChatResult, String> {
    let Some(project_id) = input.project_id.as_deref().filter(|v| !v.trim().is_empty()) else {
        return Err("Project is required for workspace chat.".into());
    };
    let allowed = enabled_providers(db, vault)?;
    if allowed.is_empty() {
        return Err(
            "Enable at least one provider (Ollama and LM Studio work without an API key).".into(),
        );
    }

    let chat = build_task_chat_bundle(
        db,
        vault,
        &allowed,
        "coding",
        input.preferred_provider.as_deref(),
        input.preferred_model.as_deref(),
        None,
        None,
    )
    .await?;

    let mut messages: Vec<TaskMessage> = input
        .messages
        .as_ref()
        .map(|items| {
            items
                .iter()
                .map(|m| TaskMessage {
                    role: m.role.clone(),
                    content: m.content.clone(),
                    agent_role: None,
                })
                .collect()
        })
        .unwrap_or_else(|| {
            vec![TaskMessage {
                role: "user".into(),
                content: input.message.trim().to_string(),
                agent_role: None,
            }]
        });

    if messages.is_empty() {
        messages.push(TaskMessage {
            role: "user".into(),
            content: input.message.trim().to_string(),
            agent_role: None,
        });
    }

    let plan = vec![
        PlanStep {
            id: None,
            title: "Understand the request".into(),
            subtitle: Some("Use the current project context and recent chat history.".into()),
            role: Some("coordinator".into()),
            status: None,
        },
        PlanStep {
            id: None,
            title: "Inspect or modify workspace files".into(),
            subtitle: Some("Use file, search, shell, plugin, and MCP tools when needed.".into()),
            role: Some("coder".into()),
            status: None,
        },
        PlanStep {
            id: None,
            title: "Return a concise result".into(),
            subtitle: Some("Summarize actions, changed files, and remaining blockers.".into()),
            role: Some("reviewer".into()),
            status: None,
        },
    ];
    let mut steps: Vec<TaskStep> = Vec::new();
    let skills_list = crate::plugins::list_local_skills_internal(db).unwrap_or_default();
    let mut total_input_tokens = 0u64;
    let mut total_output_tokens = 0u64;
    let mut total_cache_read_tokens = 0u64;
    let mut total_cache_write_tokens = 0u64;
    let mut total_estimated_cost = 0.0f64;
    let mut saw_usage = false;
    let mut saw_estimated_cost = false;
    let mut modified_files: Vec<String> = Vec::new();
    let mut last_content = String::new();
    let mut blocked_reason: Option<String> = None;
    let reply_in_arabic = response_language_for_prompt(input.message.trim()) == "Arabic";

    for iteration in 0..MAX_CHAT_AGENT_ITERATIONS {
        let prompt = format!(
            "Workspace chat request: {}\n\nYou are running inside Aura Work for this selected project. \
             If the user asks who you are, answer as Aura Work's workspace agent. \
             Always reply in the same language as the user's latest message. \
             Use tools whenever project files, code search, edits, commands, plugins, or MCP are needed. \
             Do not claim you cannot access files before trying the available tools.",
            input.message.trim()
        );
        let project_path = project_folder(db, project_id).unwrap_or_default();
        let iterate_resp: SidecarIterateResponse = sidecar_post(
            "/task/iterate",
            &serde_json::json!({
                "prompt": prompt,
                "plan": plan,
                "steps": steps,
                "messages": messages,
                "iteration": iteration,
                "projectId": project_id,
                "projectPath": project_path,
                "providerId": chat.provider_id,
                "modelId": chat.model_id,
                "credentials": chat.credentials,
                "workspaceFiles": workspace_files_summary(db, project_id, 6, 220),
                "skills": skills_list,
                "allowPlainText": true,
                "responseLanguage": response_language_for_prompt(input.message.trim()),
                "activeAgent": input.active_agent.as_deref().unwrap_or("build"),
            }),
        )
        .await?;

        if let Some(usage) = &iterate_resp.usage {
            saw_usage = true;
            total_input_tokens += usage.input_tokens.unwrap_or(0);
            total_output_tokens += usage.output_tokens.unwrap_or(0);
            total_cache_read_tokens += usage.cache_read_tokens.unwrap_or(0);
            total_cache_write_tokens += usage.cache_write_tokens.unwrap_or(0);
            if let Some(cost) = usage.estimated_cost_usd {
                saw_estimated_cost = true;
                total_estimated_cost += cost;
            }
        }

        if let Some(content) = iterate_resp.content.as_ref().or(iterate_resp.summary.as_ref()) {
            let display = strip_code_fences(content);
            if !display.trim().is_empty() {
                last_content = display.clone();
                messages.push(TaskMessage {
                    role: "assistant".into(),
                    content: display,
                    agent_role: iterate_resp.role.clone(),
                });
            }
        }

        let tool_calls = iterate_resp.tool_calls.clone().unwrap_or_default();
        if tool_calls.is_empty() {
            break;
        }

        for tc in tool_calls {
            let mut step = TaskStep {
                title: format!("Tool: {}", tc.name),
                role: iterate_resp.role.clone(),
                status: "running".into(),
                tool: Some(tc.name.clone()),
                tool_ok: None,
                output: None,
            };
            match execute_tool(db, project_id, None, &tc, None).await {
                Ok(output) => {
                    step.status = "done".into();
                    step.tool_ok = Some(true);
                    step.output = Some(output.chars().take(500).collect());
                    if matches!(
                        tc.name.as_str(),
                        "write_file" | "delete_file" | "replace_in_file"
                    ) {
                        if let Some(path) = tc.arguments.get("path").and_then(|v| v.as_str()) {
                            if !modified_files.iter().any(|p| p == path) {
                                modified_files.push(path.to_string());
                            }
                        }
                    }
                    messages.push(TaskMessage {
                        role: "tool".into(),
                        content: output,
                        agent_role: Some("system".into()),
                    });
                }
                Err(e) if e.starts_with("permission_required:") => {
                    step.status = "block".into();
                    step.tool_ok = Some(false);
                    step.output = Some("Waiting for permission".into());
                    blocked_reason = Some(if reply_in_arabic {
                        "أحتاج موافقتك قبل تشغيل هذه العملية داخل مساحة العمل. استخدم بطاقة الموافقة التي ظهرت للسماح أو الرفض، ثم أرسل رسالة متابعة إذا أردت أن أكمل.".into()
                    } else {
                        "I need your approval before running that workspace action. Use the pending approval card to allow or deny it, then send a follow-up message if you want me to continue.".into()
                    });
                    steps.push(step);
                    break;
                }
                Err(e) if e.starts_with("Pending edit approval required:") => {
                    step.status = "block".into();
                    step.tool_ok = Some(false);
                    step.output = Some("Waiting for edit approval".into());
                    blocked_reason = Some(if reply_in_arabic {
                        "حضرت تعديل ملف يحتاج موافقتك. افتح الملفات، راجع التعديلات المعلقة، ثم وافق عليها لتطبيق التغيير.".into()
                    } else {
                        "I prepared a file edit that needs your approval. Open Files, review Pending edits, and approve it to apply the change. Send another message only if you want more changes.".into()
                    });
                    steps.push(step);
                    break;
                }
                Err(e) => {
                    step.status = "block".into();
                    step.tool_ok = Some(false);
                    step.output = Some(e.clone());
                    messages.push(TaskMessage {
                        role: "tool".into(),
                        content: format!("Error: {e}"),
                        agent_role: Some("system".into()),
                    });
                }
            }
            steps.push(step);
        }

        if blocked_reason.is_some() {
            break;
        }
        if iterate_resp.complete.unwrap_or(false) || iterate_resp.response_type == "complete" {
            break;
        }
    }

    let content = blocked_reason.unwrap_or_else(|| {
        if !last_content.trim().is_empty() {
            last_content
        } else if modified_files.is_empty() {
            "I inspected the workspace and completed the request.".into()
        } else {
            format!("Done. Modified files:\n{}", modified_files.join("\n"))
        }
    });

    let (input_rate, output_rate, cache_read_rate, cache_write_rate) =
        crate::pricing::pricing_for_model(db, &chat.provider_id, &chat.model_id)
            .unwrap_or((None, None, None, None));
    let estimated = if saw_estimated_cost {
        Some(total_estimated_cost)
    } else {
        crate::pricing::estimate_cost_with_cache(
            total_input_tokens,
            total_output_tokens,
            total_cache_read_tokens,
            total_cache_write_tokens,
            input_rate,
            output_rate,
            cache_read_rate,
            cache_write_rate,
        )
    };
    let usage_id = record_usage(
        db,
        Some(project_id),
        &chat.provider_id,
        &chat.model_id,
        if saw_usage { Some(total_input_tokens) } else { None },
        if saw_usage { Some(total_output_tokens) } else { None },
        if saw_usage { Some(total_cache_read_tokens) } else { None },
        if saw_usage { Some(total_cache_write_tokens) } else { None },
        estimated,
        &chat.routing_policy,
    )?;

    Ok(ChatResult {
        text: content,
        provider_id: chat.provider_id,
        model_id: chat.model_id,
        routing_policy: chat.routing_policy,
        routing_reason: "Workspace agent used project context and tools when needed.".into(),
        input_tokens: if saw_usage { Some(total_input_tokens) } else { None },
        output_tokens: if saw_usage { Some(total_output_tokens) } else { None },
        estimated_cost_usd: estimated,
        cost_unknown: estimated.is_none() && saw_usage,
        usage_id,
        requires_fallback_approval: false,
        fallback_from: None,
    })
}
