use crate::sidecar_auth::authorized_reqwest;
use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::permissions::{check_task_permission, has_grant};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

const COMPUTER_USE_URL: &str = "http://127.0.0.1:47828";

pub const DEFAULT_BLOCKLIST: &[(&str, &str)] = &[
    ("*bank*", "Banking"),
    ("*wallet*", "Cryptocurrency wallet"),
    ("1password", "Password manager"),
    ("bitwarden", "Password manager"),
    ("lastpass", "Password manager"),
    ("keepass", "Password manager"),
    ("dashlane", "Password manager"),
    ("*health*", "Healthcare portal"),
    ("*medicare*", "Healthcare portal"),
    ("*patient*", "Healthcare portal"),
    ("*passport*", "Government identity"),
    ("*gov.uk*", "Government identity"),
    ("*irs*", "Government identity"),
    ("*tinder*", "Dating/social"),
    ("*bumble*", "Dating/social"),
    ("*robinhood*", "Investment/trading"),
    ("*etrade*", "Investment/trading"),
    ("*coinbase*", "Cryptocurrency wallet"),
    ("*binance*", "Cryptocurrency wallet"),
    ("*trading*", "Investment/trading"),
    ("*legal*", "Legal document system"),
    ("*court*", "Legal document system"),
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputerUseStatus {
    pub state: String,
    pub backend: String,
    pub backend_label: String,
    pub experimental: bool,
    pub started_at: Option<String>,
    pub last_error: Option<String>,
    pub remediation: Option<String>,
    pub running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWindow {
    pub id: String,
    pub process_name: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlocklistEntry {
    pub id: String,
    pub pattern: String,
    pub category: String,
    pub user_editable: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotRecord {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub app_target: Option<String>,
    pub file_path: String,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectComputerSettings {
    pub project_id: String,
    pub screenshot_retention: String,
}

#[derive(Debug, Deserialize)]
struct HelperHealth {
    status: String,
    phase: u32,
}

#[derive(Debug, Deserialize)]
struct HelperErrorBody {
    error: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HelperScreenshot {
    width: u32,
    height: u32,
    mime_type: String,
    base64: String,
    backend: String,
    captured_at: String,
    window_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct WindowsResponse {
    windows: Vec<DesktopWindow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActionResponse {
    ok: bool,
    message: String,
}

pub fn init_computer_use_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS computer_use_blocklist (
            id TEXT PRIMARY KEY NOT NULL,
            pattern TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            user_editable INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS computer_use_screenshots (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            task_id TEXT,
            app_target TEXT,
            file_path TEXT NOT NULL,
            width INTEGER,
            height INTEGER,
            created_at TEXT NOT NULL
        );
        "#,
    )
    .map_err(|e| e.to_string())?;

    migrate_project_screenshot_retention(conn)?;
    migrate_permission_desktop_only(conn)?;
    seed_blocklist_if_empty(conn)?;
    Ok(())
}

fn migrate_project_screenshot_retention(conn: &Connection) -> Result<(), String> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(projects)")
        .map_err(|e| e.to_string())?
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    if !cols.iter().any(|c| c == "screenshot_retention") {
        conn.execute(
            "ALTER TABLE projects ADD COLUMN screenshot_retention TEXT NOT NULL DEFAULT 'none'",
            [],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn migrate_permission_desktop_only(conn: &Connection) -> Result<(), String> {
    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(pending_permissions)")
        .map_err(|e| e.to_string())?
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    if !cols.iter().any(|c| c == "desktop_only") {
        conn.execute(
            "ALTER TABLE pending_permissions ADD COLUMN desktop_only INTEGER NOT NULL DEFAULT 0",
            [],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn seed_blocklist_if_empty(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM computer_use_blocklist", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count > 0 {
        return Ok(());
    }
    let now = chrono::Utc::now().to_rfc3339();
    for (pattern, category) in DEFAULT_BLOCKLIST {
        conn.execute(
            "INSERT INTO computer_use_blocklist (id, pattern, category, user_editable, created_at)
             VALUES (?1, ?2, ?3, 0, ?4)",
            params![uuid::Uuid::new_v4().to_string(), pattern, category, now],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn pattern_matches(pattern: &str, value: &str) -> bool {
    let lower = value.to_lowercase();
    let pat = pattern.to_lowercase();
    if pat.starts_with('*') && pat.ends_with('*') && pat.len() > 2 {
        let inner = &pat[1..pat.len() - 1];
        return lower.contains(inner);
    }
    if let Some(prefix) = pat.strip_suffix('*') {
        return lower.starts_with(prefix);
    }
    if let Some(suffix) = pat.strip_prefix('*') {
        return lower.ends_with(suffix);
    }
    lower == pat || lower.contains(&pat)
}

pub fn is_app_blocked(conn: &Connection, process_name: &str, title: &str) -> Option<BlocklistEntry> {
    let mut stmt = conn
        .prepare(
            "SELECT id, pattern, category, user_editable, created_at FROM computer_use_blocklist",
        )
        .ok()?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BlocklistEntry {
                id: row.get(0)?,
                pattern: row.get(1)?,
                category: row.get(2)?,
                user_editable: row.get::<_, i64>(3)? != 0,
                created_at: row.get(4)?,
            })
        })
        .ok()?;
    for entry in rows.flatten() {
        if pattern_matches(&entry.pattern, process_name) || pattern_matches(&entry.pattern, title) {
            return Some(entry);
        }
    }
    None
}

pub fn app_permission_target(process_name: &str) -> String {
    format!("app:{}", process_name.to_lowercase())
}

async fn helper_get<T: for<'de> Deserialize<'de>>(path: &str) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = authorized_reqwest(
        client.get(format!("{COMPUTER_USE_URL}{path}")),
        "aura-computer-use",
    )
        .send()
        .await
        .map_err(|_| {
            "Computer use helper is not running. Start it with: npm run computer-use".to_string()
        })?;
    if !resp.status().is_success() {
        let body: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: "Computer use helper error".into(),
        });
        return Err(body.error);
    }
    resp.json().await.map_err(|e| e.to_string())
}

async fn helper_post<T: for<'de> Deserialize<'de>>(
    path: &str,
    body: &serde_json::Value,
) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = authorized_reqwest(
        client.post(format!("{COMPUTER_USE_URL}{path}")),
        "aura-computer-use",
    )
        .json(body)
        .send()
        .await
        .map_err(|_| {
            "Computer use helper is not running. Start it with: npm run computer-use".to_string()
        })?;
    if !resp.status().is_success() {
        let body: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: "Computer use helper error".into(),
        });
        return Err(body.error);
    }
    resp.json().await.map_err(|e| e.to_string())
}

fn enrich_status(mut status: ComputerUseStatus) -> ComputerUseStatus {
    status.running = status.state == "running";
    status
}

#[tauri::command]
pub async fn get_computer_use_status() -> Result<ComputerUseStatus, String> {
    match helper_get::<ComputerUseStatus>("/status").await {
        Ok(s) => Ok(enrich_status(s)),
        Err(_) => Ok(ComputerUseStatus {
            state: "unavailable".into(),
            backend: "none".into(),
            backend_label: "Computer use helper offline".into(),
            experimental: true,
            started_at: None,
            last_error: Some("Computer use helper is not running".into()),
            remediation: Some("Start computer use helper: npm run computer-use".into()),
            running: false,
        }),
    }
}

#[tauri::command]
pub async fn start_computer_use() -> Result<ComputerUseStatus, String> {
    let status = helper_post::<ComputerUseStatus>("/start", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

#[tauri::command]
pub async fn stop_computer_use() -> Result<ComputerUseStatus, String> {
    let status = helper_post::<ComputerUseStatus>("/stop", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

#[tauri::command]
pub async fn list_desktop_windows() -> Result<Vec<DesktopWindow>, String> {
    ensure_computer_use_ready().await?;
    let resp = helper_get::<WindowsResponse>("/windows").await?;
    Ok(resp.windows)
}

#[tauri::command]
pub fn list_computer_use_blocklist(db: State<'_, DbState>) -> Result<Vec<BlocklistEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, pattern, category, user_editable, created_at FROM computer_use_blocklist ORDER BY category, pattern",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BlocklistEntry {
                id: row.get(0)?,
                pattern: row.get(1)?,
                category: row.get(2)?,
                user_editable: row.get::<_, i64>(3)? != 0,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBlocklistInput {
    pub entries: Vec<BlocklistEntryInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlocklistEntryInput {
    pub pattern: String,
    pub category: String,
}

#[tauri::command]
pub fn update_computer_use_blocklist(
    db: State<'_, DbState>,
    input: UpdateBlocklistInput,
) -> Result<Vec<BlocklistEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM computer_use_blocklist WHERE user_editable = 1",
        [],
    )
    .map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    for entry in input.entries {
        if entry.pattern.trim().is_empty() {
            continue;
        }
        conn.execute(
            "INSERT OR IGNORE INTO computer_use_blocklist (id, pattern, category, user_editable, created_at)
             VALUES (?1, ?2, ?3, 1, ?4)",
            params![
                uuid::Uuid::new_v4().to_string(),
                entry.pattern.trim(),
                entry.category.trim(),
                now
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    drop(conn);
    list_computer_use_blocklist(db)
}

#[tauri::command]
pub fn get_project_computer_settings(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<ProjectComputerSettings, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let retention: String = conn
        .query_row(
            "SELECT screenshot_retention FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|_| "Project not found.".to_string())?;
    Ok(ProjectComputerSettings {
        project_id,
        screenshot_retention: retention,
    })
}

#[tauri::command]
pub fn set_project_screenshot_retention(
    db: State<'_, DbState>,
    project_id: String,
    retention: String,
) -> Result<ProjectComputerSettings, String> {
    let allowed = ["none", "task", "always"];
    if !allowed.contains(&retention.as_str()) {
        return Err("Invalid retention. Use none, task, or always.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let updated = conn
        .execute(
            "UPDATE projects SET screenshot_retention = ?1, updated_at = ?2 WHERE id = ?3",
            params![retention, chrono::Utc::now().to_rfc3339(), project_id],
        )
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Project not found.".into());
    }
    Ok(ProjectComputerSettings {
        project_id,
        screenshot_retention: retention,
    })
}

#[tauri::command]
pub fn list_computer_use_screenshots(
    db: State<'_, DbState>,
    project_id: Option<String>,
    task_id: Option<String>,
) -> Result<Vec<ScreenshotRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = if task_id.is_some() {
        "SELECT id, project_id, task_id, app_target, file_path, width, height, created_at
         FROM computer_use_screenshots WHERE task_id = ?1 ORDER BY created_at DESC"
    } else if project_id.is_some() {
        "SELECT id, project_id, task_id, app_target, file_path, width, height, created_at
         FROM computer_use_screenshots WHERE project_id = ?1 ORDER BY created_at DESC"
    } else {
        "SELECT id, project_id, task_id, app_target, file_path, width, height, created_at
         FROM computer_use_screenshots ORDER BY created_at DESC LIMIT 200"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let map_row = |row: &rusqlite::Row<'_>| {
        Ok(ScreenshotRecord {
            id: row.get(0)?,
            project_id: row.get(1)?,
            task_id: row.get(2)?,
            app_target: row.get(3)?,
            file_path: row.get(4)?,
            width: row.get(5)?,
            height: row.get(6)?,
            created_at: row.get(7)?,
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

#[tauri::command]
pub fn delete_computer_use_screenshot(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let path: Option<String> = conn
        .query_row(
            "SELECT file_path FROM computer_use_screenshots WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .ok();
    conn.execute(
        "DELETE FROM computer_use_screenshots WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    if let Some(p) = path {
        let _ = std::fs::remove_file(p);
    }
    Ok(())
}

pub async fn ensure_computer_use_ready() -> Result<ComputerUseStatus, String> {
    if let Ok(health) = helper_get::<HelperHealth>("/health").await {
        if health.status == "ok" || health.status == "idle" {
            if let Ok(status) = helper_get::<ComputerUseStatus>("/status").await {
                if status.state == "running" {
                    return Ok(enrich_status(status));
                }
            }
        }
    }
    let status = helper_post::<ComputerUseStatus>("/start", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

fn screenshot_retention(conn: &Connection, project_id: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT screenshot_retention FROM projects WHERE id = ?1",
        params![project_id],
        |row| row.get(0),
    )
    .map_err(|_| "Project not found.".to_string())
}

fn screenshots_dir(db: &DbState) -> Result<PathBuf, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let db_path: String = conn
        .query_row("SELECT file FROM pragma_database_list WHERE name = 'main'", [], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;
    let dir = PathBuf::from(db_path)
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .join("computer-use-screenshots");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn check_app_access(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    process_name: &str,
    title: &str,
    reason: &str,
    tool_payload: Option<serde_json::Value>,
) -> Result<(), String> {
    if process_name.trim().is_empty() || title.trim().is_empty() {
        return Err("Computer-use app actions require processName and title from computer_list_windows.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    if let Some(blocked) = is_app_blocked(&conn, process_name, title) {
        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: Some(project_id.to_string()),
                task_id: task_id.map(String::from),
                actor: "coordinator".into(),
                category: "computer-use".into(),
                action: "use-app".into(),
                target: Some(app_permission_target(process_name)),
                summary: format!(
                    "Blocked sensitive app access: {} ({})",
                    process_name, blocked.category
                ),
                risk: Some("critical".into()),
                decision: Some("deny".into()),
                result: "denied".into(),
                metadata: Some(serde_json::json!({
                    "blocklistPattern": blocked.pattern,
                    "blocklistCategory": blocked.category,
                })),
            },
        )?;
        return Err(format!(
            "blocked_app: Access to '{}' is blocked ({}). Remove from blocklist in Computer Use settings to override.",
            process_name, blocked.category
        ));
    }

    let target = app_permission_target(process_name);
    if has_grant(&conn, project_id, "computer-use", "use-app", &target)? {
        return Ok(());
    }

    drop(conn);
    check_task_permission(
        db,
        project_id,
        task_id,
        "computer-use",
        "use-app",
        &target,
        reason,
        "high",
        true,
        tool_payload,
    )
}

pub async fn tool_computer_screenshot(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    window_id: Option<&str>,
    process_name: Option<&str>,
    title: Option<&str>,
    tool_payload: Option<serde_json::Value>,
) -> Result<String, String> {
    if let (Some(proc), Some(ttl)) = (process_name, title) {
        check_app_access(
            db,
            project_id,
            task_id,
            proc,
            ttl,
            &format!("Capture screenshot of desktop app: {proc}"),
            tool_payload.clone(),
        )?;
    } else {
        check_task_permission(
            db,
            project_id,
            task_id,
            "computer-use",
            "screenshot",
            "screen:primary",
            "Capture primary screen screenshot for computer use",
            "medium",
            true,
            tool_payload.clone(),
        )?;
    }

    ensure_computer_use_ready().await?;
    let shot = helper_post::<HelperScreenshot>(
        "/screenshot",
        &serde_json::json!({ "windowId": window_id }),
    )
    .await?;

    let retention = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        screenshot_retention(&conn, project_id)?
    };

    let mut stored_id = None;
    if retention != "none" {
        if retention == "always" || (retention == "task" && task_id.is_some()) {
            let dir = screenshots_dir(db)?;
            let file_id = uuid::Uuid::new_v4().to_string();
            let file_path = dir.join(format!("{file_id}.png"));
            let bytes = base64_decode(&shot.base64)?;
            std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;
            let now = chrono::Utc::now().to_rfc3339();
            let conn = db.0.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "INSERT INTO computer_use_screenshots
                 (id, project_id, task_id, app_target, file_path, width, height, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    file_id,
                    project_id,
                    task_id,
                    process_name.map(app_permission_target),
                    file_path.to_string_lossy(),
                    shot.width as i64,
                    shot.height as i64,
                    now
                ],
            )
            .map_err(|e| e.to_string())?;
            stored_id = Some(file_id);
        }
    }

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: Some(project_id.to_string()),
                task_id: task_id.map(String::from),
                actor: "coordinator".into(),
                category: "computer-use".into(),
                action: "screenshot".into(),
                target: process_name.map(app_permission_target),
                summary: format!(
                    "Captured screenshot {}×{} (retention: {retention})",
                    shot.width, shot.height
                ),
                risk: Some("medium".into()),
                decision: None,
                result: "succeeded".into(),
                metadata: Some(serde_json::json!({
                    "screenshotId": stored_id,
                    "retention": retention,
                    "backend": shot.backend,
                })),
            },
        )?;
    }

    Ok(format!(
        "Screenshot captured ({}×{}, backend: {}). Retention: {}.{}",
        shot.width,
        shot.height,
        shot.backend,
        retention,
        stored_id
            .map(|id| format!(" Stored screenshot id: {id}."))
            .unwrap_or_default()
    ))
}

pub async fn tool_computer_click(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    x: i64,
    y: i64,
    process_name: &str,
    title: &str,
    tool_payload: Option<serde_json::Value>,
) -> Result<String, String> {
    check_app_access(
        db,
        project_id,
        task_id,
        process_name,
        title,
        &format!("Click at ({x}, {y}) in {process_name}"),
        tool_payload,
    )?;
    ensure_computer_use_ready().await?;
    let result = helper_post::<ActionResponse>(
        "/click",
        &serde_json::json!({ "x": x, "y": y, "button": "left" }),
    )
    .await?;
    audit_action(db, project_id, task_id, "click", process_name, &result.message)?;
    Ok(result.message)
}

pub async fn tool_computer_type(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    text: &str,
    process_name: &str,
    title: &str,
    tool_payload: Option<serde_json::Value>,
) -> Result<String, String> {
    check_app_access(
        db,
        project_id,
        task_id,
        process_name,
        title,
        &format!("Type text into {process_name}"),
        tool_payload,
    )?;
    ensure_computer_use_ready().await?;
    let result = helper_post::<ActionResponse>("/type", &serde_json::json!({ "text": text })).await?;
    audit_action(db, project_id, task_id, "type", process_name, &result.message)?;
    Ok(result.message)
}

pub async fn tool_computer_focus(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    window_id: &str,
    process_name: &str,
    title: &str,
    tool_payload: Option<serde_json::Value>,
) -> Result<String, String> {
    check_app_access(
        db,
        project_id,
        task_id,
        process_name,
        title,
        &format!("Focus desktop app: {process_name}"),
        tool_payload,
    )?;
    ensure_computer_use_ready().await?;
    let result = helper_post::<ActionResponse>(
        "/focus",
        &serde_json::json!({ "windowId": window_id }),
    )
    .await?;
    audit_action(db, project_id, task_id, "focus", process_name, &result.message)?;
    Ok(result.message)
}

pub async fn tool_computer_list_windows(db: &DbState, project_id: &str, task_id: Option<&str>) -> Result<String, String> {
    check_task_permission(
        db,
        project_id,
        task_id,
        "computer-use",
        "list-windows",
        "desktop:*",
        "List visible desktop application windows",
        "low",
        true,
        None,
    )?;
    ensure_computer_use_ready().await?;
    let resp = helper_get::<WindowsResponse>("/windows").await?;
    Ok(serde_json::to_string(&resp.windows).unwrap_or_else(|_| "[]".into()))
}

fn audit_action(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    action: &str,
    process_name: &str,
    summary: &str,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id.to_string()),
            task_id: task_id.map(String::from),
            actor: "coordinator".into(),
            category: "computer-use".into(),
            action: action.into(),
            target: Some(app_permission_target(process_name)),
            summary: summary.to_string(),
            risk: Some("high".into()),
            decision: None,
            result: "succeeded".into(),
            metadata: None,
        },
    )?;
    Ok(())
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    base64::Engine::decode(&base64::engine::general_purpose::STANDARD, input)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn blocklist_pattern_matches_process_and_title() {
        assert!(pattern_matches("*password*", "1Password"));
        assert!(pattern_matches("keychain*", "Keychain Access"));
        assert!(!pattern_matches("*password*", "Notepad"));
    }

    #[test]
    fn blocked_sensitive_app_is_denied() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE projects (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                folder_path TEXT NOT NULL UNIQUE,
                instructions TEXT,
                permission_mode TEXT NOT NULL DEFAULT 'ask-first',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE pending_permissions (
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
                desktop_only INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                payload TEXT,
                created_at TEXT NOT NULL
            );",
        )
        .unwrap();
        init_computer_use_tables(&conn).unwrap();
        let hit = is_app_blocked(&conn, "1password", "1Password — Login");
        assert!(hit.is_some());
        assert_eq!(hit.unwrap().category, "Password manager");
    }
}
