use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use rusqlite::params;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DismissedEditResult {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub file_path: String,
    pub status: String,
}

#[tauri::command]
pub fn dismiss_pending_edit(
    db: State<'_, DbState>,
    edit_id: String,
) -> Result<DismissedEditResult, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let (project_id, task_id, file_path, status): (String, Option<String>, String, String) = conn
        .query_row(
            "SELECT project_id, task_id, file_path, status FROM pending_edits WHERE id = ?1",
            params![edit_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|_| "Pending edit not found.".to_string())?;

    if status != "pending" {
        return Err("Edit already resolved.".into());
    }

    conn.execute(
        "UPDATE pending_edits SET status = 'dismissed' WHERE id = ?1",
        params![edit_id],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id.clone()),
            task_id: task_id.clone(),
            actor: "user".into(),
            category: "file".into(),
            action: "dismiss_edit".into(),
            target: Some(file_path.clone()),
            summary: format!("Dismissed proposed edit for {}", file_path),
            risk: Some("low".into()),
            decision: Some("dismiss".into()),
            result: "succeeded".into(),
            metadata: None,
        },
    )?;

    Ok(DismissedEditResult {
        id: edit_id,
        project_id,
        task_id,
        file_path,
        status: "dismissed".into(),
    })
}
