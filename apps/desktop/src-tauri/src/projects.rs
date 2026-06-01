use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub folder_path: String,
    pub instructions: Option<String>,
    pub permission_mode: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub name: String,
    pub folder_path: String,
    pub instructions: Option<String>,
}

#[tauri::command]
pub fn list_projects(state: tauri::State<'_, DbState>) -> Result<Vec<Project>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, folder_path, instructions, permission_mode, created_at, updated_at
             FROM projects ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                folder_path: row.get(2)?,
                instructions: row.get(3)?,
                permission_mode: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project(state: tauri::State<'_, DbState>, id: String) -> Result<Option<Project>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, folder_path, instructions, permission_mode, created_at, updated_at
             FROM projects WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(Project {
            id: row.get(0).map_err(|e| e.to_string())?,
            name: row.get(1).map_err(|e| e.to_string())?,
            folder_path: row.get(2).map_err(|e| e.to_string())?,
            instructions: row.get(3).map_err(|e| e.to_string())?,
            permission_mode: row.get(4).map_err(|e| e.to_string())?,
            created_at: row.get(5).map_err(|e| e.to_string())?,
            updated_at: row.get(6).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn create_project(
    state: tauri::State<'_, DbState>,
    input: CreateProjectInput,
) -> Result<Project, String> {
    if input.name.trim().is_empty() {
        return Err("Project name is required.".into());
    }
    if input.folder_path.trim().is_empty() {
        return Err("Folder path is required.".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO projects (id, name, folder_path, instructions, permission_mode, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'act-without-asking', ?5, ?6)",
        params![
            id,
            input.name.trim(),
            input.folder_path.trim(),
            input.instructions,
            now,
            now
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "A project with this folder is already connected.".into()
        } else {
            e.to_string()
        }
    })?;
    Ok(Project {
        id,
        name: input.name.trim().to_string(),
        folder_path: input.folder_path.trim().to_string(),
        instructions: input.instructions,
        permission_mode: "act-without-asking".into(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_project(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let n = conn
        .execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Project not found.".into());
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetProjectPermissionInput {
    pub project_id: String,
    pub permission_mode: String,
}

#[tauri::command]
pub fn set_project_permission_mode(
    state: tauri::State<'_, DbState>,
    input: SetProjectPermissionInput,
) -> Result<Project, String> {
    let allowed = ["ask-first", "act-without-asking"];
    if !allowed.contains(&input.permission_mode.as_str()) {
        return Err("Invalid permission mode.".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let n = conn
        .execute(
            "UPDATE projects SET permission_mode = ?1, updated_at = ?2 WHERE id = ?3",
            params![input.permission_mode, now, input.project_id],
        )
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Project not found.".into());
    }
    drop(conn);
    get_project(state, input.project_id)?
        .ok_or_else(|| "Project not found.".into())
}

#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app
        .dialog()
        .file()
        .set_title("Select project folder")
        .blocking_pick_folder();
    Ok(path.map(|p| p.to_string()))
}
