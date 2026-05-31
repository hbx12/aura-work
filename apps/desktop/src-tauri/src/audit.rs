use crate::db::DbState;
use rusqlite::params;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub id: String,
    pub project_id: Option<String>,
    pub task_id: Option<String>,
    pub actor: String,
    pub category: String,
    pub action: String,
    pub target: Option<String>,
    pub summary: String,
    pub risk: Option<String>,
    pub decision: Option<String>,
    pub result: String,
    pub created_at: String,
    pub metadata: Option<String>,
}

pub fn init_audit_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT,
            task_id TEXT,
            actor TEXT NOT NULL,
            category TEXT NOT NULL,
            action TEXT NOT NULL,
            target TEXT,
            summary TEXT NOT NULL,
            risk TEXT,
            decision TEXT,
            result TEXT NOT NULL,
            created_at TEXT NOT NULL,
            metadata TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_audit_project ON audit_log(project_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_task ON audit_log(task_id, created_at DESC);
        ",
    )
    .map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendAuditInput {
    pub project_id: Option<String>,
    pub task_id: Option<String>,
    pub actor: String,
    pub category: String,
    pub action: String,
    pub target: Option<String>,
    pub summary: String,
    pub risk: Option<String>,
    pub decision: Option<String>,
    pub result: String,
    pub metadata: Option<serde_json::Value>,
}

pub fn append_audit(conn: &Connection, input: &AppendAuditInput) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let metadata = input
        .metadata
        .as_ref()
        .map(|m| serde_json::to_string(m).unwrap_or_default());
    conn.execute(
        "INSERT INTO audit_log
         (id, project_id, task_id, actor, category, action, target, summary, risk, decision, result, created_at, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id,
            input.project_id,
            input.task_id,
            input.actor,
            input.category,
            input.action,
            input.target,
            input.summary,
            input.risk,
            input.decision,
            input.result,
            now,
            metadata
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

fn map_audit_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<AuditEntry> {
    Ok(AuditEntry {
        id: row.get(0)?,
        project_id: row.get(1)?,
        task_id: row.get(2)?,
        actor: row.get(3)?,
        category: row.get(4)?,
        action: row.get(5)?,
        target: row.get(6)?,
        summary: row.get(7)?,
        risk: row.get(8)?,
        decision: row.get(9)?,
        result: row.get(10)?,
        created_at: row.get(11)?,
        metadata: row.get(12)?,
    })
}

#[tauri::command]
pub fn list_audit_entries(
    db: State<'_, DbState>,
    project_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AuditEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(100).min(500);
    let sql = if project_id.is_some() {
        "SELECT id, project_id, task_id, actor, category, action, target, summary, risk, decision, result, created_at, metadata
         FROM audit_log WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2"
    } else {
        "SELECT id, project_id, task_id, actor, category, action, target, summary, risk, decision, result, created_at, metadata
         FROM audit_log ORDER BY created_at DESC LIMIT ?1"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = if let Some(pid) = project_id {
        stmt.query_map(params![pid, lim], map_audit_row)
    } else {
        stmt.query_map(params![lim], map_audit_row)
    }
    .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
