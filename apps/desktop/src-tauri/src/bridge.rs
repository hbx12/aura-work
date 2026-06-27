use crate::audit::{append_audit, AppendAuditInput};
use crate::bridge_helper::{
    ensure_bridge_helper_ready, get_bridge_helper_status, sync_bridge_helper_config,
    stop_bridge_helper, BridgeClientConfig, BridgeHelperConfigPayload, BridgeHelperStatus,
};
use crate::bridge_internal::{self, BridgeRuntime};
use crate::db::DbState;
use crate::permissions::{create_pending_permission, CreatePermissionInput};
use crate::providers::VaultHandle;
use crate::tasks::{create_task_for_bridge, get_task_record, start_task_inner, TaskRecord};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::{Arc, OnceLock};
use tauri::State;

static BRIDGE_RUNTIME: OnceLock<Arc<BridgeRuntime>> = OnceLock::new();

pub fn init_bridge_runtime(db: DbState, vault: VaultHandle) {
    let secret = {
        let conn = db.0.lock().expect("db lock");
        load_or_create_internal_secret(&conn)
    };
    let runtime = Arc::new(BridgeRuntime {
        db,
        vault,
        internal_secret: secret.clone(),
    });
    let _ = BRIDGE_RUNTIME.set(runtime.clone());
    bridge_internal::start_server(runtime);
}

pub fn runtime() -> Result<Arc<BridgeRuntime>, String> {
    BRIDGE_RUNTIME
        .get()
        .cloned()
        .ok_or_else(|| "Bridge runtime not initialized.".into())
}

fn load_or_create_internal_secret(conn: &Connection) -> String {
    if let Ok(secret) = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'bridge_internal_secret'",
        [],
        |row| row.get::<_, String>(0),
    ) {
        if !secret.is_empty() {
            return secret;
        }
    }
    let secret = uuid::Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO app_settings (key, value) VALUES ('bridge_internal_secret', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![secret],
    );
    secret
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn init_bridge_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS bridge_pairing_codes (
            code TEXT PRIMARY KEY NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS bridge_clients (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            client_type TEXT NOT NULL,
            session_token_hash TEXT NOT NULL UNIQUE,
            project_id TEXT,
            paired_at TEXT NOT NULL,
            last_seen_at TEXT,
            revoked INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS bridge_page_reads (
            id TEXT PRIMARY KEY NOT NULL,
            client_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            task_id TEXT,
            page_url TEXT NOT NULL,
            page_title TEXT,
            permission_id TEXT NOT NULL,
            content_received INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeStatus {
    pub internal_running: bool,
    pub helper: BridgeHelperStatus,
    pub paired_client_count: u32,
    pub internal_port: u16,
    pub public_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeClientRecord {
    pub id: String,
    pub name: String,
    pub client_type: String,
    pub project_id: Option<String>,
    pub paired_at: String,
    pub last_seen_at: Option<String>,
    pub revoked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgePairingResult {
    pub code: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeProjectItem {
    pub id: String,
    pub name: String,
}

async fn refresh_bridge_helper(db: &DbState) -> Result<BridgeHelperStatus, String> {
    let _rt = runtime()?;
    let (secret, clients) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let secret = load_or_create_internal_secret(&conn);
        let clients = list_active_client_configs(&conn)?;
        (secret, clients)
    };
    ensure_bridge_helper_ready().await?;
    sync_bridge_helper_config(&BridgeHelperConfigPayload {
        internal_secret: secret,
        clients,
    })
    .await
}

fn list_active_client_configs(conn: &Connection) -> Result<Vec<BridgeClientConfig>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, client_type, session_token_hash, project_id, paired_at
             FROM bridge_clients WHERE revoked = 0 ORDER BY paired_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, String>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    Ok(rows
        .flatten()
        .map(|(id, name, client_type, token_hash, project_id, paired_at)| {
            BridgeClientConfig {
                id,
                name,
                client_type,
                session_token: token_hash,
                project_id,
                paired_at,
            }
        })
        .collect())
}

#[tauri::command]
pub async fn get_bridge_status(db: State<'_, DbState>) -> Result<BridgeStatus, String> {
    let helper = get_bridge_helper_status().await?;
    let paired_client_count = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT COUNT(*) FROM bridge_clients WHERE revoked = 0",
            [],
            |row| row.get::<_, u32>(0),
        )
        .unwrap_or(0)
    };
    Ok(BridgeStatus {
        internal_running: BRIDGE_RUNTIME.get().is_some(),
        helper,
        paired_client_count,
        internal_port: 47827,
        public_port: 47826,
    })
}

#[tauri::command]
pub async fn start_bridge(db: State<'_, DbState>) -> Result<BridgeStatus, String> {
    refresh_bridge_helper(&db).await?;
    get_bridge_status(db).await
}

#[tauri::command]
pub async fn stop_bridge(db: State<'_, DbState>) -> Result<BridgeStatus, String> {
    stop_bridge_helper().await?;
    get_bridge_status(db).await
}

#[tauri::command]
pub fn create_bridge_pairing(db: State<'_, DbState>) -> Result<BridgePairingResult, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    cleanup_expired_pairing_codes(&conn)?;
    let code = format!("{:06}", rand::random::<u32>() % 1_000_000);
    let now = chrono::Utc::now();
    let expires_at = (now + chrono::Duration::minutes(10)).to_rfc3339();
    conn.execute(
        "INSERT INTO bridge_pairing_codes (code, expires_at, created_at) VALUES (?1, ?2, ?3)",
        params![code, expires_at, now.to_rfc3339()],
    )
    .map_err(|e| e.to_string())?;
    Ok(BridgePairingResult { code, expires_at })
}

fn cleanup_expired_pairing_codes(conn: &Connection) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "DELETE FROM bridge_pairing_codes WHERE expires_at < ?1",
        params![now],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_bridge_clients(db: State<'_, DbState>) -> Result<Vec<BridgeClientRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, client_type, project_id, paired_at, last_seen_at, revoked
             FROM bridge_clients ORDER BY paired_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BridgeClientRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                client_type: row.get(2)?,
                project_id: row.get(3)?,
                last_seen_at: row.get(5)?,
                paired_at: row.get(4)?,
                revoked: row.get::<_, i64>(6)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn revoke_bridge_client(
    db: State<'_, DbState>,
    client_id: String,
) -> Result<Vec<BridgeClientRecord>, String> {
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE bridge_clients SET revoked = 1 WHERE id = ?1",
            params![client_id],
        )
        .map_err(|e| e.to_string())?;
        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: None,
                task_id: None,
                actor: "user".into(),
                category: "bridge".into(),
                action: "revoke-client".into(),
                target: Some(client_id.clone()),
                summary: format!("Revoked bridge client {client_id}"),
                risk: Some("low".into()),
                decision: None,
                result: "succeeded".into(),
                metadata: None,
            },
        )?;
    }
    refresh_bridge_helper(&db).await?;
    list_bridge_clients(db)
}

#[tauri::command]
pub fn list_bridge_projects(db: State<'_, DbState>) -> Result<Vec<BridgeProjectItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name FROM projects ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BridgeProjectItem {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

// --- Internal API handlers (called from bridge_internal.rs) ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairClaimInput {
    pub code: String,
    pub name: String,
    pub client_type: String,
    pub project_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairClaimResult {
    pub client_id: String,
    pub session_token: String,
    pub project_id: Option<String>,
}

pub fn internal_pair_claim(
    db: &DbState,
    input: &PairClaimInput,
) -> Result<PairClaimResult, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    cleanup_expired_pairing_codes(&conn)?;
    let now = chrono::Utc::now().to_rfc3339();
    let expires_at: String = conn
        .query_row(
            "SELECT expires_at FROM bridge_pairing_codes WHERE code = ?1",
            params![input.code.trim()],
            |row| row.get(0),
        )
        .map_err(|_| "Invalid or expired pairing code.".to_string())?;
    if expires_at < now {
        conn.execute(
            "DELETE FROM bridge_pairing_codes WHERE code = ?1",
            params![input.code.trim()],
        )
        .ok();
        return Err("Pairing code expired.".into());
    }
    conn.execute(
        "DELETE FROM bridge_pairing_codes WHERE code = ?1",
        params![input.code.trim()],
    )
    .map_err(|e| e.to_string())?;

    let client_id = uuid::Uuid::new_v4().to_string();
    let session_token = uuid::Uuid::new_v4().to_string();
    let token_hash = hash_token(&session_token);
    let paired_at = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO bridge_clients (id, name, client_type, session_token_hash, project_id, paired_at, revoked)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
        params![
            client_id,
            input.name.trim(),
            input.client_type.trim(),
            token_hash,
            input.project_id,
            paired_at
        ],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: input.project_id.clone(),
            task_id: None,
            actor: "bridge".into(),
            category: "bridge".into(),
            action: "pair".into(),
            target: Some(client_id.clone()),
            summary: format!(
                "Paired {} client: {}",
                input.client_type.trim(),
                input.name.trim()
            ),
            risk: Some("low".into()),
            decision: None,
            result: "succeeded".into(),
            metadata: Some(serde_json::json!({
                "clientType": input.client_type,
            })),
        },
    )?;

    Ok(PairClaimResult {
        client_id,
        session_token,
        project_id: input.project_id.clone(),
    })
}

pub fn validate_client(db: &DbState, session_token: &str) -> Result<BridgeClientRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let token_hash = hash_token(session_token);
    let client = conn
        .query_row(
            "SELECT id, name, client_type, project_id, paired_at, last_seen_at, revoked
             FROM bridge_clients WHERE session_token_hash = ?1",
            params![token_hash],
            |row| {
                Ok(BridgeClientRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    client_type: row.get(2)?,
                    project_id: row.get(3)?,
                    paired_at: row.get(4)?,
                    last_seen_at: row.get(5)?,
                    revoked: row.get::<_, i64>(6)? != 0,
                })
            },
        )
        .map_err(|_| "Invalid session token.".to_string())?;
    if client.revoked {
        return Err("Client session revoked.".into());
    }
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE bridge_clients SET last_seen_at = ?1 WHERE id = ?2",
        params![now, client.id],
    )
    .ok();
    Ok(client)
}

fn require_client_project(client: &BridgeClientRecord, project_id: &str) -> Result<(), String> {
    if let Some(bound_project_id) = client.project_id.as_deref() {
        if bound_project_id != project_id {
            return Err("Bridge client is not authorized for this project.".into());
        }
    }
    Ok(())
}

fn task_project_id(conn: &Connection, task_id: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT project_id FROM tasks WHERE id = ?1",
        params![task_id],
        |row| row.get(0),
    )
    .map_err(|_| "Task not found.".to_string())
}

fn require_client_task(
    conn: &Connection,
    client: &BridgeClientRecord,
    task_id: &str,
) -> Result<String, String> {
    let project_id = task_project_id(conn, task_id)?;
    require_client_project(client, &project_id)?;
    Ok(project_id)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageReadRequestInput {
    pub session_token: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub page_url: String,
    pub page_title: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageReadRequestResult {
    pub permission_id: String,
    pub read_id: String,
    pub status: String,
}

pub fn internal_page_read_request(
    db: &DbState,
    input: &PageReadRequestInput,
) -> Result<PageReadRequestResult, String> {
    let client = validate_client(db, &input.session_token)?;
    require_client_project(&client, &input.project_id)?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let project_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM projects WHERE id = ?1",
            params![input.project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if project_exists == 0 {
        return Err("Project not found.".into());
    }

    let permission_id = create_pending_permission(
        &conn,
        &CreatePermissionInput {
            project_id: input.project_id.clone(),
            task_id: input.task_id.clone(),
            category: "bridge".into(),
            action: "page-read".into(),
            target: input.page_url.clone(),
            reason: format!(
                "Chrome extension requests page content: {}",
                input.page_title.as_deref().unwrap_or(&input.page_url)
            ),
            risk: Some("medium".into()),
            requested_by: Some(format!("bridge:{}", client.client_type)),
            allow_always_available: Some(false),
            desktop_only: Some(true),
            payload: Some(serde_json::json!({
                "clientId": client.id,
                "pageTitle": input.page_title,
            })),
        },
    )?;

    let read_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO bridge_page_reads (id, client_id, project_id, task_id, page_url, page_title, permission_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            read_id,
            client.id,
            input.project_id,
            input.task_id,
            input.page_url,
            input.page_title,
            permission_id,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(input.project_id.clone()),
            task_id: input.task_id.clone(),
            actor: format!("bridge:{}", client.client_type),
            category: "bridge".into(),
            action: "page-read-request".into(),
            target: Some(input.page_url.clone()),
            summary: format!(
                "Page read approval requested for {}",
                input.page_title.as_deref().unwrap_or(&input.page_url)
            ),
            risk: Some("medium".into()),
            decision: None,
            result: "pending".into(),
            metadata: Some(serde_json::json!({
                "permissionId": permission_id,
                "clientId": client.id,
            })),
        },
    )?;

    Ok(PageReadRequestResult {
        permission_id,
        read_id,
        status: "pending".into(),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageReadStatusResult {
    pub permission_id: String,
    pub status: String,
    pub approved: bool,
    pub denied: bool,
}

pub fn internal_page_read_status(
    db: &DbState,
    session_token: &str,
    permission_id: &str,
) -> Result<PageReadStatusResult, String> {
    let client = validate_client(db, session_token)?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let (status, client_id): (String, String) = conn
        .query_row(
            "SELECT p.status, r.client_id
             FROM pending_permissions p
             JOIN bridge_page_reads r ON r.permission_id = p.id
             WHERE p.id = ?1 AND p.category = 'bridge' AND p.action = 'page-read'",
            params![permission_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Page read permission not found.".to_string())?;
    if client_id != client.id {
        return Err("Bridge client is not authorized for this page-read request.".into());
    }
    let approved = status == "allowed-once" || status == "allowed-always";
    let denied = status == "denied";
    Ok(PageReadStatusResult {
        permission_id: permission_id.to_string(),
        status,
        approved,
        denied,
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageReadSubmitInput {
    pub session_token: String,
    pub permission_id: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageReadSubmitResult {
    pub ok: bool,
    pub content_length: usize,
}

pub fn internal_page_read_submit(
    db: &DbState,
    input: &PageReadSubmitInput,
) -> Result<PageReadSubmitResult, String> {
    let client = validate_client(db, &input.session_token)?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let (page_url, task_id, project_id, content_received): (String, Option<String>, String, i64) =
        conn
            .query_row(
                "SELECT page_url, task_id, project_id, content_received FROM bridge_page_reads
                 WHERE permission_id = ?1 AND client_id = ?2",
                params![input.permission_id, client.id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|_| "Page read request not found.".to_string())?;

    if content_received != 0 {
        return Err("Page content already submitted for this approval.".into());
    }

    let perm_status: String = conn
        .query_row(
            "SELECT status FROM pending_permissions WHERE id = ?1",
            params![input.permission_id],
            |row| row.get(0),
        )
        .map_err(|_| "Permission not found.".to_string())?;

    if perm_status == "denied" {
        return Err("Page read was denied by user.".into());
    }
    if perm_status == "pending" {
        return Err("Page read not yet approved.".into());
    }
    if perm_status != "allowed-once" && perm_status != "allowed-always" {
        return Err("Invalid permission state.".into());
    }

    if input.content.is_empty() {
        return Err("Page content is empty.".into());
    }

    conn.execute(
        "UPDATE bridge_page_reads SET content_received = 1 WHERE permission_id = ?1",
        params![input.permission_id],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id.clone()),
            task_id: task_id.clone(),
            actor: format!("bridge:{}", client.client_type),
            category: "bridge".into(),
            action: "page-read".into(),
            target: Some(page_url.clone()),
            summary: format!(
                "Page content read ({} chars) from {}",
                input.content.len(),
                page_url.chars().take(120).collect::<String>()
            ),
            risk: Some("medium".into()),
            decision: Some("allow-once".into()),
            result: "succeeded".into(),
            metadata: Some(serde_json::json!({
                "contentLength": input.content.len(),
                "clientId": client.id,
            })),
        },
    )?;

    Ok(PageReadSubmitResult {
        ok: true,
        content_length: input.content.len(),
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeTaskCreateInput {
    pub session_token: String,
    pub project_id: String,
    pub prompt: String,
    pub source: String,
    pub page_url: Option<String>,
    pub page_title: Option<String>,
    pub page_content: Option<String>,
    pub document_context: Option<String>,
    pub office_app: Option<String>,
    pub auto_start: Option<bool>,
}

pub async fn internal_create_task(
    db: &DbState,
    vault: &VaultHandle,
    input: &BridgeTaskCreateInput,
) -> Result<TaskRecord, String> {
    let client = validate_client(db, &input.session_token)?;
    require_client_project(&client, &input.project_id)?;
    if input.prompt.trim().is_empty() {
        return Err("Task prompt is required.".into());
    }

    let mut full_prompt = input.prompt.trim().to_string();
    if let Some(ctx) = &input.document_context {
        if !ctx.trim().is_empty() {
            full_prompt.push_str("\n\n--- Document context ---\n");
            full_prompt.push_str(&ctx.chars().take(20000).collect::<String>());
        }
    }
    if let Some(content) = &input.page_content {
        if !content.trim().is_empty() {
            full_prompt.push_str("\n\n--- Page content ---\n");
            if let Some(url) = &input.page_url {
                full_prompt.push_str(&format!("URL: {url}\n"));
            }
            if let Some(title) = &input.page_title {
                full_prompt.push_str(&format!("Title: {title}\n\n"));
            }
            full_prompt.push_str(&content.chars().take(20000).collect::<String>());
        }
    }

    let task = create_task_for_bridge(
        db,
        &input.project_id,
        &full_prompt,
        &input.source,
        &client.client_type,
        &client.id,
    )?;

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: Some(input.project_id.clone()),
                task_id: Some(task.id.clone()),
                actor: format!("bridge:{}", client.client_type),
                category: "bridge".into(),
                action: "create-task".into(),
                target: Some(input.source.clone()),
                summary: format!(
                    "Task created from {} client: {}",
                    client.client_type, task.title
                ),
                risk: Some("low".into()),
                decision: None,
                result: "succeeded".into(),
                metadata: Some(serde_json::json!({
                    "clientId": client.id,
                    "officeApp": input.office_app,
                    "pageUrl": input.page_url,
                })),
            },
        )?;
    }

    if input.auto_start.unwrap_or(true) {
        return start_task_inner(db, vault, &task.id, None, None, None).await;
    }
    Ok(task)
}

pub fn internal_get_task(db: &DbState, session_token: &str, task_id: &str) -> Result<TaskRecord, String> {
    let client = validate_client(db, session_token)?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    require_client_task(&conn, &client, task_id)?;
    get_task_record(&conn, task_id)
}

pub fn internal_get_task_logs(
    db: &DbState,
    session_token: &str,
    task_id: &str,
    limit: Option<u32>,
) -> Result<Vec<crate::audit::AuditEntry>, String> {
    let client = validate_client(db, session_token)?;
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        require_client_task(&conn, &client, task_id)?;
    }
    crate::packaging::list_task_logs(db, task_id, limit.unwrap_or(200))
}

pub fn internal_open_task(db: &DbState, session_token: &str, task_id: &str) -> Result<(), String> {
    let client = validate_client(db, session_token)?;
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        require_client_task(&conn, &client, task_id)?;
        get_task_record(&conn, task_id)?;
    }
    crate::packaging::set_pending_open_task(db, task_id)
}

pub fn internal_list_projects(db: &DbState, session_token: &str) -> Result<Vec<BridgeProjectItem>, String> {
    let client = validate_client(db, session_token)?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    if let Some(project_id) = client.project_id {
        return conn
            .query_row(
                "SELECT id, name FROM projects WHERE id = ?1",
                params![project_id],
                |row| {
                    Ok(vec![BridgeProjectItem {
                        id: row.get(0)?,
                        name: row.get(1)?,
                    }])
                },
            )
            .map_err(|_| "Project not found.".to_string());
    }

    let mut stmt = conn
        .prepare("SELECT id, name FROM projects ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BridgeProjectItem {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

pub async fn after_pair_claim(db: &DbState) -> Result<(), String> {
    refresh_bridge_helper(db).await.map(|_| ())
}
