use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct DbState(pub Arc<Mutex<Connection>>);

pub fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("aura.db"))
}

pub fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            folder_path TEXT NOT NULL UNIQUE,
            instructions TEXT,
            permission_mode TEXT NOT NULL DEFAULT 'act-without-asking',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())?;
    crate::providers::init_provider_tables(&conn)?;
    crate::pricing::seed_pricing_if_empty(&conn)?;
    crate::audit::init_audit_tables(&conn)?;
    crate::permissions::init_permission_tables(&conn)?;
    crate::files::init_file_tables(&conn)?;
    crate::git::init_git_tables(&conn)?;
    crate::tasks::init_task_tables(&conn)?;
    crate::plugins::init_plugin_tables(&conn)?;
    crate::mcp::init_mcp_tables(&conn)?;
    crate::cloud::init_cloud_tables(&conn)?;
    crate::scheduled::init_scheduled_tables(&conn)?;
    crate::bridge::init_bridge_tables(&conn)?;
    crate::computer_use::init_computer_use_tables(&conn)?;
    crate::memory::init_memory_tables(&conn)?;
    Ok(conn)
}

pub fn seed_if_empty(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM projects", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count == 0 {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO projects (id, name, folder_path, instructions, permission_mode, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                uuid::Uuid::new_v4().to_string(),
                "welcome-project",
                std::env::current_dir()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|_| ".".into()),
                "Welcome to Aura OS. Replace this with your own project folder.",
                "act-without-asking",
                now,
                now
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
