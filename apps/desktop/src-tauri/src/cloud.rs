use crate::audit::{append_audit, AppendAuditInput};
use crate::cloud_crypto::{
    decrypt_sync_payload, derive_sync_key_from_recovery, device_public_key_from_device_key,
    encrypt_sync_payload, generate_recovery_key, generate_sync_key, protect_local_secret,
    recovery_key_fingerprint, unprotect_local_secret,
};
use crate::cloud_helper::{
    ack_dispatch, check_cloud_server_health, cloud_direct_get, cloud_direct_post,
    get_cloud_sync_status, list_pending_dispatch, pull_sync_envelopes, push_sync_envelopes,
    start_cloud_sync_helper, stop_cloud_sync_helper, CloudDeviceInfo, CloudSyncConfigPayload,
    CloudSyncStatus, DEFAULT_CLOUD_SERVER_URL, DispatchPendingItem, EncryptedSyncEnvelope,
};
use crate::db::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

const DEVICE_KEY_LEN: usize = 32;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudAccountStatus {
    pub signed_in: bool,
    pub account_id: Option<String>,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub server_url: String,
    pub device_id: Option<String>,
    pub device_name: Option<String>,
    pub sync_enabled: bool,
    pub has_recovery_key: bool,
    pub recovery_key_fingerprint: Option<String>,
    pub last_sync_at: Option<String>,
    pub cloud_server_reachable: bool,
    pub sync_helper: Option<CloudSyncStatus>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudAuthInput {
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
    pub server_url: Option<String>,
    pub device_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudRecoveryInput {
    pub recovery_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteDispatchInput {
    pub target_device_id: String,
    pub project_id: String,
    pub prompt: String,
}

struct LocalCloudState {
    account_id: Option<String>,
    email: Option<String>,
    display_name: Option<String>,
    server_url: String,
    access_token: Option<String>,
    device_id: Option<String>,
    device_name: Option<String>,
    sync_key_encrypted: Option<String>,
    recovery_fingerprint: Option<String>,
    sync_enabled: bool,
    last_sync_at: Option<String>,
    pull_cursor: Option<String>,
}

pub fn init_cloud_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS cloud_local (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            account_id TEXT,
            email TEXT,
            display_name TEXT,
            server_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:47830',
            access_token_encrypted TEXT,
            device_id TEXT,
            device_name TEXT,
            sync_key_encrypted TEXT,
            recovery_fingerprint TEXT,
            sync_enabled INTEGER NOT NULL DEFAULT 0,
            last_sync_at TEXT,
            pull_cursor TEXT
        );
        INSERT OR IGNORE INTO cloud_local (id, server_url) VALUES (1, 'http://127.0.0.1:47830');
        ",
    )
    .map_err(|e| e.to_string())
}

fn device_key_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("device.key"))
}

fn load_device_key(app: &AppHandle) -> Result<[u8; DEVICE_KEY_LEN], String> {
    let path = device_key_path(app)?;
    let bytes = fs::read(&path).map_err(|_| "Device key not found — open Settings to initialize vault.".to_string())?;
    if bytes.len() != DEVICE_KEY_LEN {
        return Err("Device key corrupt".into());
    }
    let mut key = [0u8; DEVICE_KEY_LEN];
    key.copy_from_slice(&bytes);
    Ok(key)
}

fn load_local_state(conn: &Connection) -> Result<LocalCloudState, String> {
    conn.query_row(
        "SELECT account_id, email, display_name, server_url, access_token_encrypted, device_id,
                device_name, sync_key_encrypted, recovery_fingerprint, sync_enabled, last_sync_at, pull_cursor
         FROM cloud_local WHERE id = 1",
        [],
        |row| {
            Ok(LocalCloudState {
                account_id: row.get(0)?,
                email: row.get(1)?,
                display_name: row.get(2)?,
                server_url: row.get(3)?,
                access_token: row.get(4)?,
                device_id: row.get(5)?,
                device_name: row.get(6)?,
                sync_key_encrypted: row.get(7)?,
                recovery_fingerprint: row.get(8)?,
                sync_enabled: row.get::<_, i64>(9)? != 0,
                last_sync_at: row.get(10)?,
                pull_cursor: row.get(11)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

fn save_local_state(conn: &Connection, state: &LocalCloudState) -> Result<(), String> {
    conn.execute(
        "UPDATE cloud_local SET
            account_id = ?1, email = ?2, display_name = ?3, server_url = ?4,
            access_token_encrypted = ?5, device_id = ?6, device_name = ?7,
            sync_key_encrypted = ?8, recovery_fingerprint = ?9, sync_enabled = ?10,
            last_sync_at = ?11, pull_cursor = ?12
         WHERE id = 1",
        params![
            state.account_id,
            state.email,
            state.display_name,
            state.server_url,
            state.access_token,
            state.device_id,
            state.device_name,
            state.sync_key_encrypted,
            state.recovery_fingerprint,
            if state.sync_enabled { 1 } else { 0 },
            state.last_sync_at,
            state.pull_cursor,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn access_token(app: &AppHandle, state: &LocalCloudState) -> Result<String, String> {
    let enc = state
        .access_token
        .as_ref()
        .ok_or("Not signed in to Aura Cloud")?;
    let device_key = load_device_key(app)?;
    unprotect_local_secret(&device_key, enc)
}

fn sync_key(app: &AppHandle, state: &LocalCloudState) -> Result<[u8; 32], String> {
    let enc = state
        .sync_key_encrypted
        .as_ref()
        .ok_or("Sync key not configured — set up recovery key first")?;
    let device_key = load_device_key(app)?;
    let raw = unprotect_local_secret(&device_key, enc)?;
    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &raw,
    )
    .map_err(|e| e.to_string())?;
    if bytes.len() != 32 {
        return Err("Invalid sync key".into());
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&bytes);
    Ok(key)
}

async fn build_account_status(_app: &AppHandle, db: &State<'_, DbState>) -> Result<CloudAccountStatus, String> {
    let state = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        load_local_state(&conn)?
    };

    let cloud_server_reachable = check_cloud_server_health(&state.server_url).await.unwrap_or(false);
    let sync_helper = get_cloud_sync_status().await.ok();

    Ok(CloudAccountStatus {
        signed_in: state.account_id.is_some(),
        account_id: state.account_id.clone(),
        email: state.email.clone(),
        display_name: state.display_name.clone(),
        server_url: state.server_url.clone(),
        device_id: state.device_id.clone(),
        device_name: state.device_name.clone(),
        sync_enabled: state.sync_enabled,
        has_recovery_key: state.recovery_fingerprint.is_some(),
        recovery_key_fingerprint: state.recovery_fingerprint.clone(),
        last_sync_at: state.last_sync_at.clone(),
        cloud_server_reachable,
        sync_helper,
    })
}

async fn ensure_device_registered(
    app: &AppHandle,
    db: &State<'_, DbState>,
    state: &mut LocalCloudState,
) -> Result<(), String> {
    if state.device_id.is_some() {
        return Ok(());
    }
    let token = access_token(app, state)?;
    let device_key = load_device_key(app)?;
    let public_key = device_public_key_from_device_key(&device_key);
    let device_name = state
        .device_name
        .clone()
        .unwrap_or_else(|| format!("Aura Desktop ({})", whoami_fallback()));

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RegisterResult {
        device: RegisterDevice,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RegisterDevice {
        id: String,
    }

    let result: RegisterResult = cloud_direct_post(
        &state.server_url,
        Some(&token),
        "/devices/register",
        &serde_json::json!({
            "name": device_name,
            "deviceType": "desktop",
            "publicKey": public_key,
        }),
    )
    .await?;

    state.device_id = Some(result.device.id);
    state.device_name = Some(device_name);
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        save_local_state(&conn, state)?;
    }
    Ok(())
}

fn whoami_fallback() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "desktop".into())
}

async fn refresh_sync_helper(app: &AppHandle, db: &State<'_, DbState>) -> Result<(), String> {
    let state = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        load_local_state(&conn)?
    };

    if !state.sync_enabled {
        let _ = stop_cloud_sync_helper().await;
        return Ok(());
    }

    let token = access_token(app, &state)?;
    let device_id = state
        .device_id
        .clone()
        .ok_or("Device not registered")?;

    let config = CloudSyncConfigPayload {
        server_url: state.server_url.clone(),
        access_token: token,
        account_id: state.account_id.clone().ok_or("Not signed in")?,
        device_id,
        sync_enabled: state.sync_enabled,
    };
    start_cloud_sync_helper(&config).await?;
    Ok(())
}

fn collect_sync_envelopes(
    conn: &Connection,
    account_id: &str,
    sync_key: &[u8; 32],
) -> Result<Vec<EncryptedSyncEnvelope>, String> {
    let mut envelopes = Vec::new();
    let now = chrono::Utc::now().to_rfc3339();

    // Projects (metadata only — no API keys)
    let mut stmt = conn
        .prepare(
            "SELECT id, name, folder_path, instructions, permission_mode, created_at, updated_at FROM projects",
        )
        .map_err(|e| e.to_string())?;
    let projects = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "folderPath": row.get::<_, String>(2)?,
                "instructions": row.get::<_, Option<String>>(3)?,
                "permissionMode": row.get::<_, String>(4)?,
                "createdAt": row.get::<_, String>(5)?,
                "updatedAt": row.get::<_, String>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for p in projects.flatten() {
        let id = p["id"].as_str().unwrap_or_default();
        let updated = p["updatedAt"].as_str().unwrap_or(&now).to_string();
        let (ciphertext, nonce) = encrypt_sync_payload(sync_key, &p)?;
        envelopes.push(EncryptedSyncEnvelope {
            id: format!("project:{id}"),
            owner_account_id: account_id.to_string(),
            object_type: "project".into(),
            version: 1,
            ciphertext,
            nonce,
            key_version: 1,
            created_at: now.clone(),
            updated_at: updated,
        });
    }

    // Tasks + history
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, prompt, state, plan_json, steps_json, messages_json,
                    plan_approved, iteration, summary, modified_files_json, created_at, updated_at
             FROM tasks",
        )
        .map_err(|e| e.to_string())?;
    let tasks = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "projectId": row.get::<_, String>(1)?,
                "title": row.get::<_, String>(2)?,
                "prompt": row.get::<_, String>(3)?,
                "state": row.get::<_, String>(4)?,
                "plan": row.get::<_, String>(5)?,
                "steps": row.get::<_, String>(6)?,
                "messages": row.get::<_, String>(7)?,
                "planApproved": row.get::<_, i64>(8)? != 0,
                "iteration": row.get::<_, i64>(9)?,
                "summary": row.get::<_, Option<String>>(10)?,
                "modifiedFiles": row.get::<_, String>(11)?,
                "createdAt": row.get::<_, String>(12)?,
                "updatedAt": row.get::<_, String>(13)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for t in tasks.flatten() {
        let id = t["id"].as_str().unwrap_or_default();
        let updated = t["updatedAt"].as_str().unwrap_or(&now).to_string();
        let (ciphertext, nonce) = encrypt_sync_payload(sync_key, &t)?;
        envelopes.push(EncryptedSyncEnvelope {
            id: format!("task:{id}"),
            owner_account_id: account_id.to_string(),
            object_type: "task".into(),
            version: 1,
            ciphertext,
            nonce,
            key_version: 1,
            created_at: now.clone(),
            updated_at: updated,
        });
    }

    // Audit entries (append-only merge on pull)
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, task_id, actor, category, action, target, summary, risk, decision, result, created_at, metadata
             FROM audit_log ORDER BY created_at ASC LIMIT 500",
        )
        .map_err(|e| e.to_string())?;
    let audits = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "projectId": row.get::<_, Option<String>>(1)?,
                "taskId": row.get::<_, Option<String>>(2)?,
                "actor": row.get::<_, String>(3)?,
                "category": row.get::<_, String>(4)?,
                "action": row.get::<_, String>(5)?,
                "target": row.get::<_, Option<String>>(6)?,
                "summary": row.get::<_, String>(7)?,
                "risk": row.get::<_, Option<String>>(8)?,
                "decision": row.get::<_, Option<String>>(9)?,
                "result": row.get::<_, String>(10)?,
                "createdAt": row.get::<_, String>(11)?,
                "metadata": row.get::<_, Option<String>>(12)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for a in audits.flatten() {
        let id = a["id"].as_str().unwrap_or_default();
        let updated = a["createdAt"].as_str().unwrap_or(&now).to_string();
        let (ciphertext, nonce) = encrypt_sync_payload(sync_key, &a)?;
        envelopes.push(EncryptedSyncEnvelope {
            id: format!("audit:{id}"),
            owner_account_id: account_id.to_string(),
            object_type: "audit-entry".into(),
            version: 1,
            ciphertext,
            nonce,
            key_version: 1,
            created_at: updated.clone(),
            updated_at: updated,
        });
    }

    // Plugin metadata (no secrets)
    let mut stmt = conn
        .prepare(
            "SELECT id, name, version, publisher, description, enabled, installed_at FROM installed_plugins",
        )
        .map_err(|e| e.to_string())?;
    let plugins = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "version": row.get::<_, String>(2)?,
                "publisher": row.get::<_, Option<String>>(3)?,
                "description": row.get::<_, Option<String>>(4)?,
                "enabled": row.get::<_, i64>(5)? != 0,
                "installedAt": row.get::<_, String>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for pl in plugins.flatten() {
        let id = pl["id"].as_str().unwrap_or_default();
        let (ciphertext, nonce) = encrypt_sync_payload(sync_key, &pl)?;
        envelopes.push(EncryptedSyncEnvelope {
            id: format!("plugin:{id}"),
            owner_account_id: account_id.to_string(),
            object_type: "plugin-metadata".into(),
            version: 1,
            ciphertext,
            nonce,
            key_version: 1,
            created_at: now.clone(),
            updated_at: now.clone(),
        });
    }

    // App settings
    let mut stmt = conn
        .prepare("SELECT key, value FROM app_settings")
        .map_err(|e| e.to_string())?;
    let settings = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "key": row.get::<_, String>(0)?,
                "value": row.get::<_, String>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for s in settings.flatten() {
        let key = s["key"].as_str().unwrap_or_default();
        if key.contains("secret") || key.contains("api_key") || key.contains("vault") {
            continue;
        }
        let (ciphertext, nonce) = encrypt_sync_payload(sync_key, &s)?;
        envelopes.push(EncryptedSyncEnvelope {
            id: format!("setting:{key}"),
            owner_account_id: account_id.to_string(),
            object_type: "setting".into(),
            version: 1,
            ciphertext,
            nonce,
            key_version: 1,
            created_at: now.clone(),
            updated_at: now.clone(),
        });
    }

    // Scheduled tasks (metadata + cadence + permission profile — no secrets)
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, prompt, project_id, routing_policy, cadence_json,
                    permission_profile_json, paused, last_run_at, next_run_at, created_at, updated_at
             FROM scheduled_tasks",
        )
        .map_err(|e| e.to_string())?;
    let schedules = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "description": row.get::<_, Option<String>>(2)?,
                "prompt": row.get::<_, String>(3)?,
                "projectId": row.get::<_, String>(4)?,
                "routingPolicy": row.get::<_, Option<String>>(5)?,
                "cadence": row.get::<_, String>(6)?,
                "permissionProfile": row.get::<_, String>(7)?,
                "paused": row.get::<_, i64>(8)? != 0,
                "lastRunAt": row.get::<_, Option<String>>(9)?,
                "nextRunAt": row.get::<_, Option<String>>(10)?,
                "createdAt": row.get::<_, String>(11)?,
                "updatedAt": row.get::<_, String>(12)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    for st in schedules.flatten() {
        let id = st["id"].as_str().unwrap_or_default();
        let updated = st["updatedAt"].as_str().unwrap_or(&now).to_string();
        let (ciphertext, nonce) = encrypt_sync_payload(sync_key, &st)?;
        envelopes.push(EncryptedSyncEnvelope {
            id: format!("scheduled-task:{id}"),
            owner_account_id: account_id.to_string(),
            object_type: "scheduled-task".into(),
            version: 1,
            ciphertext,
            nonce,
            key_version: 1,
            created_at: now.clone(),
            updated_at: updated,
        });
    }

    Ok(envelopes)
}

fn apply_pulled_envelope(conn: &Connection, env: &EncryptedSyncEnvelope, sync_key: &[u8; 32]) -> Result<(), String> {
    let payload = decrypt_sync_payload(sync_key, &env.ciphertext, &env.nonce)?;
    match env.object_type.as_str() {
        "audit-entry" => {
            let id = payload["id"].as_str().unwrap_or_default();
            let exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM audit_log WHERE id = ?1",
                    params![id],
                    |r| r.get(0),
                )
                .unwrap_or(0);
            if exists == 0 {
                conn.execute(
                    "INSERT OR IGNORE INTO audit_log
                     (id, project_id, task_id, actor, category, action, target, summary, risk, decision, result, created_at, metadata)
                     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                    params![
                        id,
                        payload["projectId"].as_str(),
                        payload["taskId"].as_str(),
                        payload["actor"].as_str().unwrap_or("sync"),
                        payload["category"].as_str().unwrap_or("sync"),
                        payload["action"].as_str().unwrap_or("sync"),
                        payload["target"].as_str(),
                        payload["summary"].as_str().unwrap_or("Synced audit entry"),
                        payload["risk"].as_str(),
                        payload["decision"].as_str(),
                        payload["result"].as_str().unwrap_or("succeeded"),
                        payload["createdAt"].as_str().unwrap_or(&env.updated_at),
                        payload["metadata"].as_str(),
                    ],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        "setting" => {
            let key = payload["key"].as_str().unwrap_or_default();
            if key.contains("secret") || key.contains("api_key") {
                return Ok(());
            }
            let value = payload["value"].as_str().unwrap_or_default();
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            )
            .map_err(|e| e.to_string())?;
        }
        "scheduled-task" => {
            let id = payload["id"].as_str().unwrap_or_default();
            let remote_updated = payload["updatedAt"].as_str().unwrap_or(&env.updated_at);
            let local_updated: Option<String> = conn
                .query_row(
                    "SELECT updated_at FROM scheduled_tasks WHERE id = ?1",
                    params![id],
                    |row| row.get(0),
                )
                .ok();
            if local_updated.as_deref() >= Some(remote_updated) {
                return Ok(());
            }
            conn.execute(
                "INSERT INTO scheduled_tasks
                 (id, name, description, prompt, project_id, routing_policy, cadence_json,
                  permission_profile_json, paused, last_run_at, next_run_at, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
                 ON CONFLICT(id) DO UPDATE SET
                   name = excluded.name,
                   description = excluded.description,
                   prompt = excluded.prompt,
                   routing_policy = excluded.routing_policy,
                   cadence_json = excluded.cadence_json,
                   permission_profile_json = excluded.permission_profile_json,
                   paused = excluded.paused,
                   last_run_at = excluded.last_run_at,
                   next_run_at = excluded.next_run_at,
                   updated_at = excluded.updated_at",
                params![
                    id,
                    payload["name"].as_str().unwrap_or("Synced schedule"),
                    payload["description"].as_str(),
                    payload["prompt"].as_str().unwrap_or(""),
                    payload["projectId"].as_str().unwrap_or(""),
                    payload["routingPolicy"].as_str(),
                    payload["cadence"].as_str().unwrap_or("{\"kind\":\"manual\"}"),
                    payload["permissionProfile"].as_str().unwrap_or("[]"),
                    if payload["paused"].as_bool().unwrap_or(false) { 1 } else { 0 },
                    payload["lastRunAt"].as_str(),
                    payload["nextRunAt"].as_str(),
                    payload["createdAt"].as_str().unwrap_or(&env.updated_at),
                    remote_updated,
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        _ => {}
    }
    Ok(())
}

async fn process_one_dispatch(
    app: &AppHandle,
    db: &State<'_, DbState>,
    item: &DispatchPendingItem,
    sync_key: &[u8; 32],
) -> Result<(), String> {
    let payload = decrypt_sync_payload(sync_key, &item.ciphertext, &item.nonce)?;
    let project_id = payload["projectId"]
        .as_str()
        .ok_or("Dispatch missing projectId")?;
    let prompt = payload["prompt"].as_str().ok_or("Dispatch missing prompt")?;

    let exists: i64 = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT COUNT(*) FROM projects WHERE id = ?1",
            params![project_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?
    };

    if exists == 0 {
        ack_dispatch(&item.id, "failed", Some("Project not found on desktop"), None, None).await?;
        return Err("Project not found on desktop".into());
    }

    let task_id = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let task_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let title: String = prompt.chars().take(60).collect();
        conn.execute(
            "INSERT INTO tasks (id, project_id, title, prompt, state, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 'draft', ?5, ?6)",
            params![task_id, project_id, title, prompt.trim(), now, now],
        )
        .map_err(|e| e.to_string())?;

        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: Some(project_id.to_string()),
                task_id: Some(task_id.clone()),
                actor: "remote".into(),
                category: "cloud".into(),
                action: "remote-dispatch".into(),
                target: Some(item.source_device_id.clone()),
                summary: format!("Remote dispatch created task: {title}"),
                risk: Some("medium".into()),
                decision: None,
                result: "succeeded".into(),
                metadata: Some(serde_json::json!({ "dispatchId": item.id })),
            },
        )?;
        task_id
    };

    let (resp_ct, resp_nonce) = encrypt_sync_payload(
        sync_key,
        &serde_json::json!({
            "taskId": task_id,
            "state": "draft",
            "message": "Task created on desktop",
        }),
    )?;

    ack_dispatch(
        &item.id,
        "completed",
        None,
        Some(&resp_ct),
        Some(&resp_nonce),
    )
    .await?;

    let _ = app;
    Ok(())
}

#[tauri::command]
pub async fn get_cloud_status(
    app: AppHandle,
    db: State<'_, DbState>,
) -> Result<CloudAccountStatus, String> {
    build_account_status(&app, &db).await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudRegisterResult {
    pub status: CloudAccountStatus,
    pub recovery_key: String,
}

#[tauri::command]
pub async fn cloud_register(
    app: AppHandle,
    db: State<'_, DbState>,
    input: CloudAuthInput,
) -> Result<CloudRegisterResult, String> {
    let server_url = input
        .server_url
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_CLOUD_SERVER_URL.to_string());

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct AuthResult {
        account_id: String,
        email: String,
        display_name: String,
        token: String,
    }

    let result: AuthResult = cloud_direct_post(
        &server_url,
        None,
        "/auth/register",
        &serde_json::json!({
            "email": input.email,
            "password": input.password,
            "displayName": input.display_name,
        }),
    )
    .await?;

    let device_key = load_device_key(&app)?;
    let token_enc = protect_local_secret(&device_key, &result.token)?;

    let sync_key_bytes = generate_sync_key();
    let sync_key_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        sync_key_bytes,
    );
    let sync_key_enc = protect_local_secret(&device_key, &sync_key_b64)?;
    let recovery = generate_recovery_key();
    let fingerprint = recovery_key_fingerprint(&recovery);

    let mut state = LocalCloudState {
        account_id: Some(result.account_id),
        email: Some(result.email),
        display_name: Some(result.display_name),
        server_url,
        access_token: Some(token_enc),
        device_id: None,
        device_name: input.device_name,
        sync_key_encrypted: Some(sync_key_enc),
        recovery_fingerprint: Some(fingerprint),
        sync_enabled: false,
        last_sync_at: None,
        pull_cursor: None,
    };

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        save_local_state(&conn, &state)?;
    }

    ensure_device_registered(&app, &db, &mut state).await?;

    let status = build_account_status(&app, &db).await?;
    Ok(CloudRegisterResult {
        status,
        recovery_key: recovery,
    })
}

#[tauri::command]
pub async fn cloud_login(
    app: AppHandle,
    db: State<'_, DbState>,
    input: CloudAuthInput,
) -> Result<CloudAccountStatus, String> {
    let server_url = input
        .server_url
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_CLOUD_SERVER_URL.to_string());

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct AuthResult {
        account_id: String,
        email: String,
        display_name: String,
        token: String,
    }

    let result: AuthResult = cloud_direct_post(
        &server_url,
        None,
        "/auth/login",
        &serde_json::json!({
            "email": input.email,
            "password": input.password,
        }),
    )
    .await?;

    let device_key = load_device_key(&app)?;
    let token_enc = protect_local_secret(&device_key, &result.token)?;

    let mut state = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut state = load_local_state(&conn)?;
        state.account_id = Some(result.account_id);
        state.email = Some(result.email);
        state.display_name = Some(result.display_name);
        state.server_url = server_url;
        state.access_token = Some(token_enc);
        state.device_name = input.device_name.or(state.device_name);
        save_local_state(&conn, &state)?;
        state
    };

    ensure_device_registered(&app, &db, &mut state).await?;
    build_account_status(&app, &db).await
}

#[tauri::command]
pub async fn cloud_logout(app: AppHandle, db: State<'_, DbState>) -> Result<CloudAccountStatus, String> {
    let _ = stop_cloud_sync_helper().await;
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let server_url = load_local_state(&conn)?.server_url;
        let state = LocalCloudState {
            account_id: None,
            email: None,
            display_name: None,
            server_url,
            access_token: None,
            device_id: None,
            device_name: None,
            sync_key_encrypted: None,
            recovery_fingerprint: None,
            sync_enabled: false,
            last_sync_at: None,
            pull_cursor: None,
        };
        save_local_state(&conn, &state)?;
    }
    build_account_status(&app, &db).await
}

#[tauri::command]
pub async fn cloud_setup_recovery(
    app: AppHandle,
    db: State<'_, DbState>,
    input: CloudRecoveryInput,
) -> Result<CloudAccountStatus, String> {
    let device_key = load_device_key(&app)?;
    let sync_key_bytes = derive_sync_key_from_recovery(&input.recovery_key);
    let sync_key_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        sync_key_bytes,
    );
    let sync_key_enc = protect_local_secret(&device_key, &sync_key_b64)?;
    let fingerprint = recovery_key_fingerprint(&input.recovery_key);

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut state = load_local_state(&conn)?;
        state.sync_key_encrypted = Some(sync_key_enc);
        state.recovery_fingerprint = Some(fingerprint);
        save_local_state(&conn, &state)?;
    }
    build_account_status(&app, &db).await
}

#[tauri::command]
pub async fn cloud_set_sync_enabled(
    app: AppHandle,
    db: State<'_, DbState>,
    enabled: bool,
) -> Result<CloudAccountStatus, String> {
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut state = load_local_state(&conn)?;
        state.sync_enabled = enabled;
        save_local_state(&conn, &state)?;
    }
    refresh_sync_helper(&app, &db).await?;
    build_account_status(&app, &db).await
}

#[tauri::command]
pub async fn cloud_sync_now(app: AppHandle, db: State<'_, DbState>) -> Result<CloudAccountStatus, String> {
    let (mut state, account_id) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let state = load_local_state(&conn)?;
        let account_id = state.account_id.clone().ok_or("Not signed in")?;
        (state, account_id)
    };

    refresh_sync_helper(&app, &db).await?;
    let key = sync_key(&app, &state)?;

    let envelopes = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        collect_sync_envelopes(&conn, &account_id, &key)?
    };

    if !envelopes.is_empty() {
        push_sync_envelopes(&envelopes).await?;
    }

    let pulled = pull_sync_envelopes(state.pull_cursor.as_deref()).await?;
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        for env in &pulled {
            apply_pulled_envelope(&conn, env, &key)?;
        }
        if let Some(last) = pulled.last() {
            state.pull_cursor = Some(last.updated_at.clone());
        }
        state.last_sync_at = Some(chrono::Utc::now().to_rfc3339());
        save_local_state(&conn, &state)?;
    }

    let pending = list_pending_dispatch().await.unwrap_or_default();
    for item in pending {
        let _ = process_one_dispatch(&app, &db, &item, &key).await;
    }

    build_account_status(&app, &db).await
}

#[tauri::command]
pub async fn cloud_create_pairing(
    app: AppHandle,
    db: State<'_, DbState>,
) -> Result<serde_json::Value, String> {
    let state = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        load_local_state(&conn)?
    };

    let token = access_token(&app, &state)?;
    let device_id = state.device_id.ok_or("Device not registered")?;
    let device_key = load_device_key(&app)?;
    let public_key = device_public_key_from_device_key(&device_key);

    cloud_direct_post(
        &state.server_url,
        Some(&token),
        "/pairing/create",
        &serde_json::json!({ "deviceId": device_id, "publicKey": public_key }),
    )
    .await
}

#[tauri::command]
pub async fn cloud_list_devices(app: AppHandle, db: State<'_, DbState>) -> Result<Vec<CloudDeviceInfo>, String> {
    let state = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        load_local_state(&conn)?
    };
    let token = access_token(&app, &state)?;

    #[derive(Deserialize)]
    struct DevicesResult {
        devices: Vec<CloudDeviceInfo>,
    }
    let result: DevicesResult = cloud_direct_get(&state.server_url, Some(&token), "/devices").await?;
    Ok(result.devices)
}

#[tauri::command]
pub async fn cloud_revoke_device(
    app: AppHandle,
    db: State<'_, DbState>,
    device_id: String,
) -> Result<(), String> {
    let (state, token) = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let state = load_local_state(&conn)?;
        let token = access_token(&app, &state)?;
        Ok::<_, String>((state, token))
    }?;
    let client = reqwest::Client::new();
    let url = format!("{}/devices/{}", state.server_url.trim_end_matches('/'), device_id);
    client
        .delete(&url)
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn cloud_remote_dispatch(
    app: AppHandle,
    db: State<'_, DbState>,
    input: RemoteDispatchInput,
) -> Result<serde_json::Value, String> {
    let state = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        load_local_state(&conn)?
    };

    let key = sync_key(&app, &state)?;
    let source_device_id = state.device_id.clone().ok_or("Device not registered")?;

    let (ciphertext, nonce) = encrypt_sync_payload(
        &key,
        &serde_json::json!({
            "projectId": input.project_id,
            "prompt": input.prompt,
        }),
    )?;

    refresh_sync_helper(&app, &db).await?;

    let token = access_token(&app, &state)?;
    let client = reqwest::Client::new();

    let resp = client
        .post(format!(
            "{}/dispatch/request",
            state.server_url.trim_end_matches('/')
        ))
        .header("Authorization", format!("Bearer {token}"))
        .json(&serde_json::json!({
            "sourceDeviceId": source_device_id,
            "targetDeviceId": input.target_device_id,
            "ciphertext": ciphertext,
            "nonce": nonce,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status();
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(body["message"]
            .as_str()
            .or_else(|| body["error"].as_str())
            .unwrap_or("Remote dispatch failed")
            .to_string());
    }
    Ok(body)
}

#[tauri::command]
pub async fn cloud_inspect_server(app: AppHandle, db: State<'_, DbState>) -> Result<serde_json::Value, String> {
    let state = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        load_local_state(&conn)?
    };
    let token = access_token(&app, &state)?;
    cloud_direct_get(&state.server_url, Some(&token), "/sync/inspect").await
}

#[tauri::command]
pub async fn start_cloud_sync(app: AppHandle, db: State<'_, DbState>) -> Result<CloudSyncStatus, String> {
    refresh_sync_helper(&app, &db).await?;
    get_cloud_sync_status().await
}

#[tauri::command]
pub async fn stop_cloud_sync(_db: State<'_, DbState>) -> Result<CloudSyncStatus, String> {
    stop_cloud_sync_helper().await
}

#[tauri::command]
pub async fn get_cloud_sync_helper_status() -> Result<CloudSyncStatus, String> {
    get_cloud_sync_status().await
}
