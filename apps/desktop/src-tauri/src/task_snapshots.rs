use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::files::{normalize_rel, resolve_project_path};
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::State;

const MAX_SNAPSHOT_BYTES: u64 = 8 * 1024 * 1024;
const SNAPSHOT_B64_PREFIX: &str = "__AURA_SNAPSHOT_V1_BASE64__:";
const LEGACY_SKIPPED_MARKER: &str = "[Binary or too large file skipped]";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RollbackFilePreview {
    pub file_path: String,
    pub is_new: bool,
    pub exists: bool,
}

fn encode_snapshot_bytes(bytes: &[u8]) -> String {
    format!("{SNAPSHOT_B64_PREFIX}{}", B64.encode(bytes))
}

fn decode_snapshot_content(content: &str, rel_path: &str) -> Result<Vec<u8>, String> {
    if content == LEGACY_SKIPPED_MARKER {
        return Err(format!(
            "Cannot safely roll back {rel_path}: its original content was not captured."
        ));
    }

    if let Some(encoded) = content.strip_prefix(SNAPSHOT_B64_PREFIX) {
        return B64
            .decode(encoded)
            .map_err(|e| format!("Failed to decode rollback snapshot for {rel_path}: {e}"));
    }

    Ok(content.as_bytes().to_vec())
}

fn validate_snapshot_rel_path(rel_path: &str) -> Result<String, String> {
    let rel_path = normalize_rel(rel_path);
    if rel_path.trim().is_empty() {
        return Err("Snapshot path is required.".into());
    }
    if looks_like_windows_absolute_path(&rel_path) {
        return Err("Snapshot path must be relative.".into());
    }
    let path = Path::new(&rel_path);
    if path.is_absolute() {
        return Err("Snapshot path must be relative.".into());
    }
    for component in path.components() {
        match component {
            Component::Normal(_) | Component::CurDir => {}
            Component::ParentDir => return Err("Snapshot path traversal is not allowed.".into()),
            Component::RootDir | Component::Prefix(_) => {
                return Err("Snapshot path must be relative.".into())
            }
        }
    }
    Ok(rel_path)
}

fn looks_like_windows_absolute_path(path: &str) -> bool {
    let bytes = path.as_bytes();
    bytes.len() >= 3
        && bytes[1] == b':'
        && bytes[0].is_ascii_alphabetic()
        && (bytes[2] == b'/' || bytes[2] == b'\\')
}

fn resolve_snapshot_path(root: &str, rel_path: &str) -> Result<PathBuf, String> {
    let rel_path = validate_snapshot_rel_path(rel_path)?;
    let canonical_root = PathBuf::from(root)
        .canonicalize()
        .map_err(|e| format!("Project folder not accessible: {e}"))?;
    let joined = canonical_root.join(&rel_path);
    let mut check = joined.clone();
    while !check.exists() {
        let Some(parent) = check.parent() else {
            break;
        };
        check = parent.to_path_buf();
    }
    let canonical_existing = check
        .canonicalize()
        .map_err(|e| format!("Snapshot path parent is not accessible: {e}"))?;
    if !canonical_existing.starts_with(&canonical_root) {
        return Err("Snapshot path is outside the project folder.".into());
    }
    Ok(joined)
}

pub fn capture_snapshot_for_file(
    conn: &Connection,
    project_id: &str,
    task_id: &str,
    file_path: &str,
) -> Result<(), String> {
    let rel_path = normalize_rel(file_path);

    // Check if snapshot row already exists for this task & file
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM task_snapshots WHERE task_id = ?1 AND file_path = ?2)",
            params![task_id, rel_path],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if exists {
        return Ok(());
    }

    // Load project folder
    let root: String = conn
        .query_row(
            "SELECT folder_path FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|_| "Project not found for snapshot.".to_string())?;

    let resolved = resolve_project_path(&root, &rel_path);
    let now = chrono::Utc::now().to_rfc3339();

    match resolved {
        Ok(path) => {
            if path.exists() && path.is_file() {
                let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
                if metadata.len() > MAX_SNAPSHOT_BYTES {
                    return Err(format!(
                        "Cannot safely snapshot {rel_path}: file is larger than {} MB.",
                        MAX_SNAPSHOT_BYTES / 1024 / 1024
                    ));
                }

                let content = fs::read(&path).map_err(|e| e.to_string())?;
                let encoded_content = encode_snapshot_bytes(&content);
                conn.execute(
                    "INSERT INTO task_snapshots (id, task_id, project_id, file_path, original_content, is_new, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
                    params![
                        uuid::Uuid::new_v4().to_string(),
                        task_id,
                        project_id,
                        rel_path,
                        encoded_content,
                        now
                    ],
                )
                .map_err(|e| e.to_string())?;
            } else {
                // Not a file, or doesn't exist yet -> newly created file
                conn.execute(
                    "INSERT INTO task_snapshots (id, task_id, project_id, file_path, original_content, is_new, created_at)
                     VALUES (?1, ?2, ?3, ?4, NULL, 1, ?5)",
                    params![
                        uuid::Uuid::new_v4().to_string(),
                        task_id,
                        project_id,
                        rel_path,
                        now
                    ],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        Err(_) => {
            // Treat as new/missing
            conn.execute(
                "INSERT INTO task_snapshots (id, task_id, project_id, file_path, original_content, is_new, created_at)
                 VALUES (?1, ?2, ?3, ?4, NULL, 1, ?5)",
                params![
                    uuid::Uuid::new_v4().to_string(),
                    task_id,
                    project_id,
                    rel_path,
                    now
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_rollback_preview(
    db: State<'_, DbState>,
    task_id: String,
) -> Result<Vec<RollbackFilePreview>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT project_id, file_path, is_new FROM task_snapshots WHERE task_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![task_id], |row| {
            let project_id: String = row.get(0)?;
            let file_path: String = row.get(1)?;
            let is_new: i64 = row.get(2)?;
            Ok((project_id, file_path, is_new != 0))
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for row in rows.flatten() {
        let (project_id, file_path, is_new) = row;
        let root = conn
            .query_row(
                "SELECT folder_path FROM projects WHERE id = ?1",
                params![project_id],
                |r| r.get::<_, String>(0),
            )
            .unwrap_or_default();

        let exists = if !root.is_empty() {
            if let Ok(path) = resolve_project_path(&root, &file_path) {
                path.exists()
            } else {
                false
            }
        } else {
            false
        };

        out.push(RollbackFilePreview {
            file_path,
            is_new,
            exists,
        });
    }

    Ok(out)
}

#[tauri::command]
pub async fn has_task_snapshot(db: State<'_, DbState>, task_id: String) -> Result<bool, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM task_snapshots WHERE task_id = ?1",
            params![task_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

#[tauri::command]
pub async fn rollback_task(db: State<'_, DbState>, task_id: String) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT project_id, file_path, original_content, is_new FROM task_snapshots
             WHERE task_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    struct SnapshotEntry {
        project_id: String,
        file_path: String,
        original_content: Option<String>,
        is_new: bool,
    }

    let rows = stmt
        .query_map(params![task_id], |row| {
            Ok(SnapshotEntry {
                project_id: row.get(0)?,
                file_path: row.get(1)?,
                original_content: row.get(2)?,
                is_new: row.get::<_, i64>(3)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let entries: Vec<SnapshotEntry> = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    if entries.is_empty() {
        return Err("No snapshot found for this task.".into());
    }

    let project_id = entries[0].project_id.clone();
    let root = conn
        .query_row(
            "SELECT folder_path FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|_| "Project not found for rollback.".to_string())?;

    // Perform file restoration/deletion
    for entry in &entries {
        let rel_path = normalize_rel(&entry.file_path);
        let path = resolve_snapshot_path(&root, &rel_path)?;

        if entry.is_new {
            if path.exists() && path.is_file() {
                fs::remove_file(&path).map_err(|e| {
                    format!("Failed to delete created file {}: {}", rel_path, e)
                })?;
            }
        } else if let Some(content) = &entry.original_content {
            let bytes = decode_snapshot_content(content, &rel_path)?;
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::write(&path, bytes).map_err(|e| {
                format!("Failed to restore file content {}: {}", rel_path, e)
            })?;
        }
    }

    // Clear snapshot entries for this task
    conn.execute(
        "DELETE FROM task_snapshots WHERE task_id = ?1",
        params![task_id],
    )
    .map_err(|e| e.to_string())?;

    // Update task status to rolled_back
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE tasks SET state = 'rolled_back', updated_at = ?2 WHERE id = ?1",
        params![task_id, now],
    )
    .map_err(|e| e.to_string())?;

    // Append to audit log
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id),
            task_id: Some(task_id.clone()),
            actor: "user".into(),
            category: "task".into(),
            action: "rollback".into(),
            target: Some(task_id.clone()),
            summary: format!("Rolled back agent changes for task {}", task_id),
            risk: Some("medium".into()),
            decision: Some("rollback".into()),
            result: "succeeded".into(),
            metadata: None,
        },
    )?;

    Ok("Rollback completed successfully.".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_snapshot_root(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "aura-work-snapshot-{name}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn snapshot_path_allows_missing_file_under_project() {
        let root = temp_snapshot_root("missing-file");
        let resolved = resolve_snapshot_path(root.to_str().unwrap(), "src/deleted.ts").unwrap();

        assert_eq!(
            resolved,
            root.canonicalize().unwrap().join("src").join("deleted.ts")
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn snapshot_path_rejects_escape() {
        let root = temp_snapshot_root("escape");

        assert!(resolve_snapshot_path(root.to_str().unwrap(), "../secret.txt").is_err());
        assert!(resolve_snapshot_path(root.to_str().unwrap(), "/tmp/secret.txt").is_err());
        assert!(resolve_snapshot_path(root.to_str().unwrap(), "C:/Users/example/secret.txt").is_err());
        assert!(resolve_snapshot_path(root.to_str().unwrap(), "C:\\Users\\example\\secret.txt").is_err());

        let _ = fs::remove_dir_all(root);
    }
}
