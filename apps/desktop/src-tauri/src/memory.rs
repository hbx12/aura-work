use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingMemory {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub content: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEntry {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

pub fn init_memory_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pending_memories (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            task_id TEXT,
            content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS project_memories (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            task_id TEXT,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pending_memories_project ON pending_memories(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_memories_project ON project_memories(project_id);
        ",
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_pending_memories(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<Vec<PendingMemory>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, task_id, content, status, created_at
             FROM pending_memories WHERE project_id = ?1 AND status = 'pending'
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], |row| {
            Ok(PendingMemory {
                id: row.get(0)?,
                project_id: row.get(1)?,
                task_id: row.get(2)?,
                content: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_memories(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<Vec<MemoryEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, task_id, content, created_at, updated_at
             FROM project_memories WHERE project_id = ?1 ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], |row| {
            Ok(MemoryEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                task_id: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn approve_memory(db: State<'_, DbState>, memory_id: String) -> Result<MemoryEntry, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let pending: PendingMemory = conn
        .query_row(
            "SELECT id, project_id, task_id, content, status, created_at
             FROM pending_memories WHERE id = ?1 AND status = 'pending'",
            params![memory_id],
            |row| {
                Ok(PendingMemory {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    task_id: row.get(2)?,
                    content: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                })
            },
        )
        .map_err(|_| "Pending memory not found.".to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO project_memories (id, project_id, task_id, content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            pending.project_id,
            pending.task_id,
            pending.content,
            now,
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE pending_memories SET status = 'approved' WHERE id = ?1",
        params![memory_id],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(pending.project_id.clone()),
            task_id: pending.task_id.clone(),
            actor: "user".into(),
            category: "memory".into(),
            action: "approve".into(),
            target: Some(id.clone()),
            summary: "Approved project memory".into(),
            risk: Some("low".into()),
            decision: Some("approved".into()),
            result: "success".into(),
            metadata: None,
        },
    )?;

    Ok(MemoryEntry {
        id,
        project_id: pending.project_id,
        task_id: pending.task_id,
        content: pending.content,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn reject_memory(db: State<'_, DbState>, memory_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let n = conn
        .execute(
            "UPDATE pending_memories SET status = 'rejected' WHERE id = ?1 AND status = 'pending'",
            params![memory_id],
        )
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Pending memory not found.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn delete_memory(db: State<'_, DbState>, memory_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let n = conn
        .execute(
            "DELETE FROM project_memories WHERE id = ?1",
            params![memory_id],
        )
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Memory not found.".into());
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposeMemoryInput {
    pub project_id: String,
    pub task_id: Option<String>,
    pub content: String,
}

#[tauri::command]
pub fn propose_memory(
    db: State<'_, DbState>,
    input: ProposeMemoryInput,
) -> Result<PendingMemory, String> {
    if input.content.trim().is_empty() {
        return Err("Memory content is required.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO pending_memories (id, project_id, task_id, content, status, created_at)
         VALUES (?1, ?2, ?3, ?4, 'pending', ?5)",
        params![id, input.project_id, input.task_id, input.content.trim(), now],
    )
    .map_err(|e| e.to_string())?;
    Ok(PendingMemory {
        id,
        project_id: input.project_id,
        task_id: input.task_id,
        content: input.content.trim().to_string(),
        status: "pending".into(),
        created_at: now,
    })
}
