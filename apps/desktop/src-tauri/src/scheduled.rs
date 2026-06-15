use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::permissions::PermissionProfileGrant;
use crate::providers::VaultHandle;
use crate::tasks::{
    advance_task_inner, approve_task_plan_inner, create_task_for_schedule, start_task_inner,
    TaskRecord,
};
use chrono::{Datelike, Duration, Timelike, Utc, Weekday};
use rusqlite::params;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, State};

static SCHEDULER_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledCadence {
    pub kind: String,
    #[serde(default)]
    pub hour: Option<u32>,
    #[serde(default)]
    pub minute: Option<u32>,
    #[serde(default)]
    pub day_of_week: Option<u32>,
    #[serde(default)]
    pub cron: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledTaskRecord {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub prompt: String,
    pub project_id: String,
    pub routing_policy: Option<String>,
    pub cadence: ScheduledCadence,
    pub permission_profile: Vec<PermissionProfileGrant>,
    pub paused: bool,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledTaskListItem {
    pub id: String,
    pub name: String,
    pub project_id: String,
    pub cadence_kind: String,
    pub paused: bool,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledTaskRun {
    pub id: String,
    pub scheduled_task_id: String,
    pub task_id: Option<String>,
    pub status: String,
    pub error: Option<String>,
    pub started_at: String,
    pub finished_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScheduledTaskInput {
    pub name: String,
    pub description: Option<String>,
    pub prompt: String,
    pub project_id: String,
    pub routing_policy: Option<String>,
    pub cadence: ScheduledCadence,
    pub permission_profile: Vec<PermissionProfileGrant>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateScheduledTaskInput {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub prompt: Option<String>,
    pub routing_policy: Option<String>,
    pub cadence: Option<ScheduledCadence>,
    pub permission_profile: Option<Vec<PermissionProfileGrant>>,
    pub paused: Option<bool>,
}

pub fn init_scheduled_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS scheduled_tasks (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            prompt TEXT NOT NULL,
            project_id TEXT NOT NULL,
            routing_policy TEXT,
            cadence_json TEXT NOT NULL,
            permission_profile_json TEXT NOT NULL DEFAULT '[]',
            paused INTEGER NOT NULL DEFAULT 0,
            last_run_at TEXT,
            next_run_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next ON scheduled_tasks(paused, next_run_at);
        CREATE TABLE IF NOT EXISTS scheduled_task_runs (
            id TEXT PRIMARY KEY NOT NULL,
            scheduled_task_id TEXT NOT NULL,
            task_id TEXT,
            status TEXT NOT NULL,
            error TEXT,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            FOREIGN KEY (scheduled_task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_scheduled_runs_task ON scheduled_task_runs(scheduled_task_id, started_at DESC);
        ",
    )
    .map_err(|e| e.to_string())?;

    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN scheduled_task_id TEXT", []);
    Ok(())
}

fn load_scheduled(conn: &Connection, id: &str) -> Result<ScheduledTaskRecord, String> {
    conn.query_row(
        "SELECT id, name, description, prompt, project_id, routing_policy, cadence_json,
                permission_profile_json, paused, last_run_at, next_run_at, created_at, updated_at
         FROM scheduled_tasks WHERE id = ?1",
        params![id],
        |row| {
            let cadence: String = row.get(6)?;
            let profile: String = row.get(7)?;
            Ok(ScheduledTaskRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                prompt: row.get(3)?,
                project_id: row.get(4)?,
                routing_policy: row.get(5)?,
                cadence: serde_json::from_str(&cadence).unwrap_or(ScheduledCadence {
                    kind: "manual".into(),
                    hour: None,
                    minute: None,
                    day_of_week: None,
                    cron: None,
                }),
                permission_profile: serde_json::from_str(&profile).unwrap_or_default(),
                paused: row.get::<_, i64>(8)? != 0,
                last_run_at: row.get(9)?,
                next_run_at: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        },
    )
    .map_err(|_| "Scheduled task not found.".to_string())
}

fn save_scheduled_timestamps(
    conn: &Connection,
    id: &str,
    last_run_at: Option<&str>,
    next_run_at: Option<&str>,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE scheduled_tasks SET last_run_at = ?1, next_run_at = ?2, updated_at = ?3 WHERE id = ?4",
        params![last_run_at, next_run_at, now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn compute_next_run(cadence: &ScheduledCadence, after: chrono::DateTime<Utc>) -> Option<String> {
    if cadence.kind == "manual" {
        return None;
    }

    let minute = cadence.minute.unwrap_or(0);
    let hour = cadence.hour.unwrap_or(9);

    let mut cursor = after + Duration::minutes(1);
    cursor = cursor
        .with_second(0)
        .unwrap_or(cursor)
        .with_nanosecond(0)
        .unwrap_or(cursor);

    for _ in 0..(366 * 24 * 60) {
        if cadence.kind == "hourly" {
            if cursor.minute() == minute {
                return Some(cursor.to_rfc3339());
            }
        } else if cadence.kind == "daily" {
            if cursor.hour() == hour && cursor.minute() == minute {
                return Some(cursor.to_rfc3339());
            }
        } else if cadence.kind == "weekly" {
            let target = cadence.day_of_week.unwrap_or(1);
            let dow = weekday_to_u32(cursor.weekday());
            if dow == target && cursor.hour() == hour && cursor.minute() == minute {
                return Some(cursor.to_rfc3339());
            }
        } else if cadence.kind == "weekdays" {
            let wd = cursor.weekday();
            if wd != Weekday::Sat && wd != Weekday::Sun
                && cursor.hour() == hour
                && cursor.minute() == minute
            {
                return Some(cursor.to_rfc3339());
            }
        } else if cadence.kind == "custom" {
            if let Some(ref cron) = cadence.cron {
                if cron_matches(cron, cursor) {
                    return Some(cursor.to_rfc3339());
                }
            }
        }
        cursor += Duration::minutes(1);
    }
    None
}

fn weekday_to_u32(w: Weekday) -> u32 {
    match w {
        Weekday::Sun => 0,
        Weekday::Mon => 1,
        Weekday::Tue => 2,
        Weekday::Wed => 3,
        Weekday::Thu => 4,
        Weekday::Fri => 5,
        Weekday::Sat => 6,
    }
}

fn cron_field_matches(field: &str, value: u32) -> bool {
    if field == "*" {
        return true;
    }
    if let Ok(n) = field.parse::<u32>() {
        return n == value;
    }
    if field.contains(',') {
        return field
            .split(',')
            .filter_map(|p| p.trim().parse::<u32>().ok())
            .any(|n| n == value);
    }
    if field.contains('-') {
        let parts: Vec<&str> = field.split('-').collect();
        if parts.len() == 2 {
            if let (Ok(a), Ok(b)) = (parts[0].parse::<u32>(), parts[1].parse::<u32>()) {
                return value >= a && value <= b;
            }
        }
    }
    if field.starts_with("*/") {
        if let Ok(step) = field[2..].parse::<u32>() {
            return step > 0 && value % step == 0;
        }
    }
    false
}

fn cron_matches(cron: &str, dt: chrono::DateTime<Utc>) -> bool {
    let parts: Vec<&str> = cron.split_whitespace().collect();
    if parts.len() != 5 {
        return false;
    }
    cron_field_matches(parts[0], dt.minute())
        && cron_field_matches(parts[1], dt.hour())
        && cron_field_matches(parts[2], dt.day())
        && cron_field_matches(parts[3], dt.month())
        && cron_field_matches(parts[4], weekday_to_u32(dt.weekday()))
}

pub fn default_permission_profiles() -> Vec<(String, Vec<PermissionProfileGrant>)> {
    vec![
        (
            "read-only".into(),
            vec![PermissionProfileGrant {
                category: "file".into(),
                action: "read".into(),
                target_pattern: "*".into(),
            }],
        ),
        (
            "safe-automation".into(),
            vec![
                PermissionProfileGrant {
                    category: "file".into(),
                    action: "read".into(),
                    target_pattern: "*".into(),
                },
                PermissionProfileGrant {
                    category: "file".into(),
                    action: "write".into(),
                    target_pattern: "*".into(),
                },
                PermissionProfileGrant {
                    category: "shell".into(),
                    action: "read".into(),
                    target_pattern: "*".into(),
                },
            ],
        ),
        (
            "research".into(),
            vec![
                PermissionProfileGrant {
                    category: "file".into(),
                    action: "read".into(),
                    target_pattern: "*".into(),
                },
                PermissionProfileGrant {
                    category: "browser".into(),
                    action: "browse".into(),
                    target_pattern: "*".into(),
                },
            ],
        ),
    ]
}

#[tauri::command]
pub fn list_scheduled_tasks(
    db: State<'_, DbState>,
    project_id: Option<String>,
) -> Result<Vec<ScheduledTaskListItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = if project_id.is_some() {
        "SELECT id, name, project_id, cadence_json, paused, last_run_at, next_run_at, updated_at
         FROM scheduled_tasks WHERE project_id = ?1 ORDER BY updated_at DESC"
    } else {
        "SELECT id, name, project_id, cadence_json, paused, last_run_at, next_run_at, updated_at
         FROM scheduled_tasks ORDER BY updated_at DESC"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let map = |row: &rusqlite::Row<'_>| {
        let cadence: String = row.get(3)?;
        let kind = serde_json::from_str::<ScheduledCadence>(&cadence)
            .map(|c| c.kind)
            .unwrap_or_else(|_| "manual".into());
        Ok(ScheduledTaskListItem {
            id: row.get(0)?,
            name: row.get(1)?,
            project_id: row.get(2)?,
            cadence_kind: kind,
            paused: row.get::<_, i64>(4)? != 0,
            last_run_at: row.get(5)?,
            next_run_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    };
    let rows = if let Some(pid) = project_id {
        stmt.query_map(params![pid], map)
    } else {
        stmt.query_map([], map)
    }
    .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_scheduled_task(db: State<'_, DbState>, id: String) -> Result<ScheduledTaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load_scheduled(&conn, &id)
}

#[tauri::command]
pub fn create_scheduled_task(
    db: State<'_, DbState>,
    input: CreateScheduledTaskInput,
) -> Result<ScheduledTaskRecord, String> {
    if input.name.trim().is_empty() || input.prompt.trim().is_empty() {
        return Err("Name and prompt are required.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM projects WHERE id = ?1",
            params![input.project_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err("Project not found.".into());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let next = compute_next_run(&input.cadence, Utc::now());
    conn.execute(
        "INSERT INTO scheduled_tasks
         (id, name, description, prompt, project_id, routing_policy, cadence_json, permission_profile_json,
          paused, last_run_at, next_run_at, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,0,NULL,?9,?10,?11)",
        params![
            id,
            input.name.trim(),
            input.description,
            input.prompt.trim(),
            input.project_id,
            input.routing_policy,
            serde_json::to_string(&input.cadence).unwrap_or_else(|_| "{}".into()),
            serde_json::to_string(&input.permission_profile).unwrap_or_else(|_| "[]".into()),
            next,
            now,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(input.project_id.clone()),
            task_id: None,
            actor: "user".into(),
            category: "scheduled-task".into(),
            action: "create".into(),
            target: Some(id.clone()),
            summary: format!("Created scheduled task: {}", input.name.trim()),
            risk: Some("low".into()),
            decision: None,
            result: "succeeded".into(),
            metadata: None,
        },
    )?;

    load_scheduled(&conn, &id)
}

#[tauri::command]
pub fn update_scheduled_task(
    db: State<'_, DbState>,
    input: UpdateScheduledTaskInput,
) -> Result<ScheduledTaskRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut task = load_scheduled(&conn, &input.id)?;
    if let Some(name) = input.name {
        task.name = name;
    }
    if input.description.is_some() {
        task.description = input.description;
    }
    if let Some(prompt) = input.prompt {
        task.prompt = prompt;
    }
    if input.routing_policy.is_some() {
        task.routing_policy = input.routing_policy;
    }
    if let Some(cadence) = input.cadence {
        task.cadence = cadence;
    }
    if let Some(profile) = input.permission_profile {
        task.permission_profile = profile;
    }
    if let Some(paused) = input.paused {
        task.paused = paused;
    }

    let next = if task.paused || task.cadence.kind == "manual" {
        None
    } else {
        compute_next_run(&task.cadence, Utc::now())
    };
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE scheduled_tasks SET name = ?1, description = ?2, prompt = ?3, routing_policy = ?4,
         cadence_json = ?5, permission_profile_json = ?6, paused = ?7, next_run_at = ?8, updated_at = ?9
         WHERE id = ?10",
        params![
            task.name,
            task.description,
            task.prompt,
            task.routing_policy,
            serde_json::to_string(&task.cadence).unwrap_or_else(|_| "{}".into()),
            serde_json::to_string(&task.permission_profile).unwrap_or_else(|_| "[]".into()),
            if task.paused { 1 } else { 0 },
            next,
            now,
            input.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    load_scheduled(&conn, &input.id)
}

#[tauri::command]
pub fn delete_scheduled_task(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let task = load_scheduled(&conn, &id)?;
    conn.execute("DELETE FROM scheduled_tasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(task.project_id),
            task_id: None,
            actor: "user".into(),
            category: "scheduled-task".into(),
            action: "delete".into(),
            target: Some(id),
            summary: format!("Deleted scheduled task: {}", task.name),
            risk: Some("low".into()),
            decision: None,
            result: "succeeded".into(),
            metadata: None,
        },
    )?;
    Ok(())
}

#[tauri::command]
pub fn list_scheduled_task_runs(
    db: State<'_, DbState>,
    scheduled_task_id: String,
    limit: Option<u32>,
) -> Result<Vec<ScheduledTaskRun>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(20).min(100);
    let mut stmt = conn
        .prepare(
            "SELECT id, scheduled_task_id, task_id, status, error, started_at, finished_at
             FROM scheduled_task_runs WHERE scheduled_task_id = ?1
             ORDER BY started_at DESC LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![scheduled_task_id, lim], |row| {
            Ok(ScheduledTaskRun {
                id: row.get(0)?,
                scheduled_task_id: row.get(1)?,
                task_id: row.get(2)?,
                status: row.get(3)?,
                error: row.get(4)?,
                started_at: row.get(5)?,
                finished_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn insert_run(
    conn: &Connection,
    scheduled_task_id: &str,
    task_id: Option<&str>,
    status: &str,
    error: Option<&str>,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let finished = if status == "started" {
        None
    } else {
        Some(now.clone())
    };
    conn.execute(
        "INSERT INTO scheduled_task_runs (id, scheduled_task_id, task_id, status, error, started_at, finished_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![id, scheduled_task_id, task_id, status, error, now, finished],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

fn finish_run(conn: &Connection, run_id: &str, status: &str, error: Option<&str>) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE scheduled_task_runs SET status = ?1, error = ?2, finished_at = ?3 WHERE id = ?4",
        params![status, error, now, run_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn execute_scheduled_run_internal(
    db: &DbState,
    vault: &VaultHandle,
    scheduled_id: &str,
    trigger: &str,
) -> Result<TaskRecord, String> {
    let (scheduled, run_id) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let scheduled = load_scheduled(&conn, scheduled_id)?;
        if scheduled.paused && trigger == "scheduler" {
            return Err("Scheduled task is paused.".into());
        }
        let run_id = insert_run(&conn, scheduled_id, None, "started", None)?;
        (scheduled, run_id)
    };

    let task_result = async {
        let task = create_task_for_schedule(db, &scheduled.project_id, &scheduled.prompt, scheduled_id)?;
        {
            let conn = db.0.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE scheduled_task_runs SET task_id = ?1 WHERE id = ?2",
                params![task.id, run_id],
            )
            .map_err(|e| e.to_string())?;
        }

        let planned = start_task_inner(db, vault, &task.id, None, None).await?;
        if planned.state != "waiting-for-approval" {
            return Err(format!("Unexpected task state after plan: {}", planned.state));
        }
        let approved = approve_task_plan_inner(db, &task.id)?;

        let mut current = approved;
        for _ in 0..20 {
            if current.state != "running" {
                break;
            }
            current = advance_task_inner(db, vault, &current.id, None).await?;
            if current.state == "waiting-for-approval" {
                break;
            }
            if current.state == "completed"
                || current.state == "blocked"
                || current.state == "failed"
            {
                break;
            }
        }
        Ok(current)
    }
    .await;

    let now = Utc::now();
    let (run_status, run_error, next_run) = match &task_result {
        Ok(task) => {
            let (status, err) = match task.state.as_str() {
                "completed" => ("completed", None),
                "waiting-for-approval" => (
                    "permission-blocked",
                    Some("Scheduled task stopped — permission outside pre-approved profile.".into()),
                ),
                "blocked" | "failed" => (
                    "failed",
                    task.error.clone().or_else(|| Some("Task failed.".into())),
                ),
                _ => ("failed", Some(format!("Task ended in state: {}", task.state))),
            };
            let next = if scheduled.cadence.kind != "manual" && !scheduled.paused {
                compute_next_run(&scheduled.cadence, now)
            } else {
                scheduled.next_run_at.clone()
            };
            (status, err, next)
        }
        Err(e) => {
            let next = if scheduled.cadence.kind != "manual" && !scheduled.paused {
                compute_next_run(&scheduled.cadence, now)
            } else {
                scheduled.next_run_at.clone()
            };
            ("failed", Some(e.clone()), next)
        }
    };

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        finish_run(
            &conn,
            &run_id,
            run_status,
            run_error.as_deref(),
        )?;
        save_scheduled_timestamps(
            &conn,
            scheduled_id,
            Some(now.to_rfc3339().as_str()),
            next_run.as_deref(),
        )?;

        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: Some(scheduled.project_id.clone()),
                task_id: task_result.as_ref().ok().map(|t| t.id.clone()),
                actor: if trigger == "manual" { "user" } else { "scheduler" }.into(),
                category: "scheduled-task".into(),
                action: "run".into(),
                target: Some(scheduled_id.to_string()),
                summary: format!(
                    "Scheduled task \"{}\" run ({trigger}): {run_status}",
                    scheduled.name
                ),
                risk: Some(if run_status == "completed" {
                    "low".into()
                } else {
                    "medium".into()
                }),
                decision: None,
                result: if run_status == "completed" {
                    "succeeded".into()
                } else {
                    "failed".into()
                },
                metadata: run_error
                    .as_ref()
                    .map(|e| serde_json::Value::String(e.clone())),
            },
        )?;
    }

    task_result
}

#[tauri::command]
pub async fn run_scheduled_task_now(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    id: String,
) -> Result<TaskRecord, String> {
    execute_scheduled_run_internal(&db, &vault, &id, "manual").await
}

#[tauri::command]
pub fn pause_scheduled_task(db: State<'_, DbState>, id: String) -> Result<ScheduledTaskRecord, String> {
    update_scheduled_task(
        db,
        UpdateScheduledTaskInput {
            id,
            name: None,
            description: None,
            prompt: None,
            routing_policy: None,
            cadence: None,
            permission_profile: None,
            paused: Some(true),
        },
    )
}

#[tauri::command]
pub fn resume_scheduled_task(db: State<'_, DbState>, id: String) -> Result<ScheduledTaskRecord, String> {
    update_scheduled_task(
        db,
        UpdateScheduledTaskInput {
            id,
            name: None,
            description: None,
            prompt: None,
            routing_policy: None,
            cadence: None,
            permission_profile: None,
            paused: Some(false),
        },
    )
}

pub fn process_missed_on_startup(app: &AppHandle) -> Result<(), String> {
    let db = app.state::<DbState>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut stmt = conn
        .prepare(
            "SELECT id, name, project_id, next_run_at FROM scheduled_tasks
             WHERE paused = 0 AND cadence_json NOT LIKE '%\"manual\"%'
             AND next_run_at IS NOT NULL AND next_run_at < ?1",
        )
        .map_err(|e| e.to_string())?;
    let missed: Vec<(String, String)> = stmt
        .query_map(params![now], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    for (id, name) in missed {
        insert_run(
            &conn,
            &id,
            None,
            "missed",
            Some("Aura was closed — scheduled run was missed."),
        )?;
        if let Ok(scheduled) = load_scheduled(&conn, &id) {
            let next = compute_next_run(&scheduled.cadence, Utc::now());
            save_scheduled_timestamps(&conn, &id, scheduled.last_run_at.as_deref(), next.as_deref())?;
            append_audit(
                &conn,
                &AppendAuditInput {
                    project_id: Some(scheduled.project_id),
                    task_id: None,
                    actor: "scheduler".into(),
                    category: "scheduled-task".into(),
                    action: "missed".into(),
                    target: Some(id.clone()),
                    summary: format!("Missed scheduled run for \"{name}\""),
                    risk: Some("medium".into()),
                    decision: None,
                    result: "failed".into(),
                    metadata: Some("App was closed.".into()),
                },
            )?;
        }
    }
    Ok(())
}

pub async fn scheduler_tick(app: &AppHandle) -> Result<(), String> {
    if SCHEDULER_RUNNING.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    let result = async {
        let db = app.state::<DbState>();
        let vault = app.state::<VaultHandle>();
        let due_ids: Vec<String> = {
            let conn = db.0.lock().map_err(|e| e.to_string())?;
            let now = Utc::now().to_rfc3339();
            let mut stmt = conn
                .prepare(
                    "SELECT id FROM scheduled_tasks
                     WHERE paused = 0 AND next_run_at IS NOT NULL AND next_run_at <= ?1",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![now], |row| row.get(0))
                .map_err(|e| e.to_string())?;
            rows.flatten().collect()
        };

        for id in due_ids {
            let _ = execute_scheduled_run_internal(&db, &vault, &id, "scheduler").await;
        }
        Ok::<(), String>(())
    }
    .await;

    SCHEDULER_RUNNING.store(false, Ordering::SeqCst);
    result
}

pub fn start_scheduler(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let _ = process_missed_on_startup(&app);
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(60)).await;
            let _ = scheduler_tick(&app).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn daily_next_run() {
        let cadence = ScheduledCadence {
            kind: "daily".into(),
            hour: Some(9),
            minute: Some(0),
            day_of_week: None,
            cron: None,
        };
        let after = Utc::now()
            .with_hour(10)
            .unwrap()
            .with_minute(0)
            .unwrap()
            .with_second(0)
            .unwrap();
        let next = compute_next_run(&cadence, after);
        assert!(next.is_some());
    }
}
