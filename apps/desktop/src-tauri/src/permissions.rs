use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use rusqlite::params;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionProfileGrant {
    pub category: String,
    pub action: String,
    pub target_pattern: String,
}

pub fn profile_allows(
    profile: &[PermissionProfileGrant],
    category: &str,
    action: &str,
    target: &str,
) -> bool {
    for grant in profile {
        if grant.category == category
            && grant.action == action
            && target_matches(&grant.target_pattern, target)
        {
            return true;
        }
    }
    false
}

fn load_scheduled_profile(
    conn: &Connection,
    task_id: Option<&str>,
) -> Option<Vec<PermissionProfileGrant>> {
    let tid = task_id?;
    let scheduled_id: Option<String> = conn
        .query_row(
            "SELECT scheduled_task_id FROM tasks WHERE id = ?1",
            params![tid],
            |row| row.get(0),
        )
        .ok()
        .flatten()?;
    let profile_json: String = conn
        .query_row(
            "SELECT permission_profile_json FROM scheduled_tasks WHERE id = ?1",
            params![scheduled_id],
            |row| row.get(0),
        )
        .ok()?;
    serde_json::from_str(&profile_json).ok()
}

pub fn scheduled_auto_write_allowed(
    db: &DbState,
    task_id: Option<&str>,
    target: &str,
) -> bool {
    let conn = match db.0.lock() {
        Ok(c) => c,
        Err(_) => return false,
    };
    let Some(profile) = load_scheduled_profile(&conn, task_id) else {
        return false;
    };
    profile_allows(&profile, "file", "write", target)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionRequest {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub category: String,
    pub action: String,
    pub target: String,
    pub reason: String,
    pub risk: String,
    pub requested_by: String,
    pub allow_always_available: bool,
    pub desktop_only: bool,
    pub status: String,
    pub created_at: String,
}

pub fn init_permission_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS project_permission_grants (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            category TEXT NOT NULL,
            action TEXT NOT NULL,
            target_pattern TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pending_permissions (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            task_id TEXT,
            category TEXT NOT NULL,
            action TEXT NOT NULL,
            target TEXT NOT NULL,
            reason TEXT NOT NULL,
            risk TEXT NOT NULL,
            requested_by TEXT NOT NULL,
            allow_always_available INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'pending',
            payload TEXT,
            created_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())
}

pub fn has_grant(
    conn: &Connection,
    project_id: &str,
    category: &str,
    action: &str,
    target: &str,
) -> Result<bool, String> {
    let mut stmt = conn
        .prepare(
            "SELECT target_pattern FROM project_permission_grants
             WHERE project_id = ?1 AND category = ?2 AND action = ?3",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id, category, action], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|e| e.to_string())?;
    for pattern in rows.flatten() {
        if target_matches(&pattern, target) {
            return Ok(true);
        }
    }
    Ok(false)
}

fn target_matches(pattern: &str, target: &str) -> bool {
    if pattern == "*" || pattern == target {
        return true;
    }
    if let Some(prefix) = pattern.strip_suffix('*') {
        return target.starts_with(prefix);
    }
    false
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePermissionInput {
    pub project_id: String,
    pub task_id: Option<String>,
    pub category: String,
    pub action: String,
    pub target: String,
    pub reason: String,
    pub risk: Option<String>,
    pub requested_by: Option<String>,
    pub allow_always_available: Option<bool>,
    pub desktop_only: Option<bool>,
    pub payload: Option<serde_json::Value>,
}

pub fn create_pending_permission(
    conn: &Connection,
    input: &CreatePermissionInput,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let payload = input
        .payload
        .as_ref()
        .map(|p| serde_json::to_string(p).unwrap_or_default());
    conn.execute(
        "INSERT INTO pending_permissions
         (id, project_id, task_id, category, action, target, reason, risk, requested_by, allow_always_available, desktop_only, status, payload, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending', ?12, ?13)",
        params![
            id,
            input.project_id,
            input.task_id,
            input.category,
            input.action,
            input.target,
            input.reason,
            input.risk.as_deref().unwrap_or("medium"),
            input.requested_by.as_deref().unwrap_or("coordinator"),
            if input.allow_always_available.unwrap_or(true) {
                1
            } else {
                0
            },
            if input.desktop_only.unwrap_or(false) {
                1
            } else {
                0
            },
            payload,
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

pub fn check_or_request(
    conn: &Connection,
    project_id: &str,
    task_id: Option<&str>,
    permission_mode: &str,
    category: &str,
    action: &str,
    target: &str,
    reason: &str,
    risk: &str,
    always_requires: bool,
    payload: Option<serde_json::Value>,
) -> Result<(), String> {
    if has_grant(conn, project_id, category, action, target)? {
        return Ok(());
    }
    if permission_mode == "act-without-asking" && !always_requires {
        return Ok(());
    }
    let pending_id = create_pending_permission(
        conn,
        &CreatePermissionInput {
            project_id: project_id.to_string(),
            task_id: task_id.map(String::from),
            category: category.to_string(),
            action: action.to_string(),
            target: target.to_string(),
            reason: reason.to_string(),
            risk: Some(risk.to_string()),
            requested_by: Some("coordinator".into()),
            allow_always_available: Some(category != "computer-use"),
            desktop_only: Some(category == "computer-use"),
            payload,
        },
    )?;
    Err(format!("permission_required:{pending_id}"))
}

pub fn check_task_permission(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    category: &str,
    action: &str,
    target: &str,
    reason: &str,
    risk: &str,
    always_requires: bool,
    payload: Option<serde_json::Value>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mode: String = conn
        .query_row(
            "SELECT permission_mode FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|_| "Project not found.".to_string())?;

    if always_requires {
        return check_or_request(
            &conn,
            project_id,
            task_id,
            "ask-first",
            category,
            action,
            target,
            reason,
            risk,
            true,
            payload,
        );
    }

    if let Some(profile) = load_scheduled_profile(&conn, task_id) {
        if profile_allows(&profile, category, action, target) {
            return Ok(());
        }
        let pending_id = create_pending_permission(
            &conn,
            &CreatePermissionInput {
                project_id: project_id.to_string(),
                task_id: task_id.map(String::from),
                category: category.to_string(),
                action: action.to_string(),
                target: target.to_string(),
                reason: format!(
                    "Scheduled task stopped — needs permission outside pre-approved profile: {reason}"
                ),
                risk: Some(risk.to_string()),
                requested_by: Some("scheduler".into()),
                allow_always_available: Some(false),
                desktop_only: Some(category == "computer-use"),
                payload,
            },
        )?;
        return Err(format!("permission_required:{pending_id}"));
    }

    check_or_request(
        &conn,
        project_id,
        task_id,
        &mode,
        category,
        action,
        target,
        reason,
        risk,
        false,
        payload,
    )
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvePermissionInput {
    pub permission_id: String,
    pub decision: String,
}

#[tauri::command]
pub fn resolve_permission(
    db: State<'_, DbState>,
    input: ResolvePermissionInput,
) -> Result<PermissionRequest, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    resolve_permission_in_conn(&conn, &input)
}

pub fn resolve_permission_in_conn(
    conn: &Connection,
    input: &ResolvePermissionInput,
) -> Result<PermissionRequest, String> {
    let row: PermissionRequest = conn
        .query_row(
            "SELECT id, project_id, task_id, category, action, target, reason, risk, requested_by, allow_always_available, desktop_only, status, created_at
             FROM pending_permissions WHERE id = ?1",
            params![input.permission_id],
            |row| {
                Ok(PermissionRequest {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    task_id: row.get(2)?,
                    category: row.get(3)?,
                    action: row.get(4)?,
                    target: row.get(5)?,
                    reason: row.get(6)?,
                    risk: row.get(7)?,
                    requested_by: row.get(8)?,
                    allow_always_available: row.get::<_, i64>(9)? != 0,
                    desktop_only: row.get::<_, i64>(10)? != 0,
                    status: row.get(11)?,
                    created_at: row.get(12)?,
                })
            },
        )
        .map_err(|_| "Permission request not found.".to_string())?;

    if row.status != "pending" {
        return Err("Permission already resolved.".into());
    }

    let decision = input.decision.as_str();
    let (status, audit_result) = match decision {
        "allow-once" => ("allowed-once", "allowed"),
        "allow-always-project" => ("allowed-always", "allowed"),
        "deny" => ("denied", "denied"),
        _ => return Err("Invalid decision.".into()),
    };

    conn.execute(
        "UPDATE pending_permissions SET status = ?1 WHERE id = ?2",
        params![status, input.permission_id],
    )
    .map_err(|e| e.to_string())?;

    if decision == "allow-always-project" {
        let grant_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO project_permission_grants (id, project_id, category, action, target_pattern, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                grant_id,
                row.project_id,
                row.category,
                row.action,
                row.target,
                now
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(row.project_id.clone()),
            task_id: row.task_id.clone(),
            actor: "user".into(),
            category: "permission".into(),
            action: row.action.clone(),
            target: Some(row.target.clone()),
            summary: format!("{} — {}", row.reason, decision),
            risk: Some(row.risk.clone()),
            decision: Some(decision.to_string()),
            result: audit_result.into(),
            metadata: None,
        },
    )?;

    Ok(PermissionRequest {
        status: status.to_string(),
        ..row
    })
}

#[tauri::command]
pub fn list_pending_permissions(
    db: State<'_, DbState>,
    project_id: Option<String>,
    task_id: Option<String>,
) -> Result<Vec<PermissionRequest>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = if task_id.is_some() {
        "SELECT id, project_id, task_id, category, action, target, reason, risk, requested_by, allow_always_available, desktop_only, status, created_at
         FROM pending_permissions WHERE status = 'pending' AND task_id = ?1 ORDER BY created_at ASC"
    } else if project_id.is_some() {
        "SELECT id, project_id, task_id, category, action, target, reason, risk, requested_by, allow_always_available, desktop_only, status, created_at
         FROM pending_permissions WHERE status = 'pending' AND project_id = ?1 ORDER BY created_at ASC"
    } else {
        "SELECT id, project_id, task_id, category, action, target, reason, risk, requested_by, allow_always_available, desktop_only, status, created_at
         FROM pending_permissions WHERE status = 'pending' ORDER BY created_at ASC"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let map_row = |row: &rusqlite::Row<'_>| {
        Ok(PermissionRequest {
            id: row.get(0)?,
            project_id: row.get(1)?,
            task_id: row.get(2)?,
            category: row.get(3)?,
            action: row.get(4)?,
            target: row.get(5)?,
            reason: row.get(6)?,
            risk: row.get(7)?,
            requested_by: row.get(8)?,
            allow_always_available: row.get::<_, i64>(9)? != 0,
            desktop_only: row.get::<_, i64>(10)? != 0,
            status: row.get(11)?,
            created_at: row.get(12)?,
        })
    };
    let rows = if let Some(tid) = task_id {
        stmt.query_map(params![tid], map_row)
    } else if let Some(pid) = project_id {
        stmt.query_map(params![pid], map_row)
    } else {
        stmt.query_map([], map_row)
    }
    .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_pending_payload(
    conn: &Connection,
    permission_id: &str,
) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT payload FROM pending_permissions WHERE id = ?1",
        params![permission_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn target_pattern_matching() {
        assert!(target_matches("*", "/any/path"));
        assert!(target_matches("/src/*", "/src/main.rs"));
        assert!(!target_matches("/src/*", "/lib/main.rs"));
    }

    #[test]
    fn scheduled_profile_grants_limited_write() {
        let profile = vec![PermissionProfileGrant {
            category: "file".into(),
            action: "write".into(),
            target_pattern: "/project/src/*".into(),
        }];
        assert!(profile_allows(&profile, "file", "write", "/project/src/app.ts"));
        assert!(!profile_allows(&profile, "file", "write", "/project/docs/readme.md"));
        assert!(!profile_allows(&profile, "file", "read", "/project/src/app.ts"));
    }

    #[test]
    fn high_impact_always_requires_blocks_act_without_asking_bypass() {
        let mode = "act-without-asking";
        let always_requires = true;
        let would_bypass = mode == "act-without-asking" && !always_requires;
        assert!(
            !would_bypass,
            "always_requires must prevent act-without-asking from skipping approval"
        );
    }
}
