use crate::sidecar_auth::authorized_reqwest;
use crate::db::DbState;
use crate::vault::{VaultState, derive_fingerprint};
use base64::Engine;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

const CODEX_DEVICE_LOGIN_URL: &str = "https://auth.openai.com/codex/device";

fn open_external_url(app: &AppHandle, url: &str) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| format!("Could not open browser: {e}"))
}

#[derive(Clone)]
pub struct VaultHandle(pub Arc<Mutex<VaultState>>);

const PROVIDERS: &[(&str, &str, bool)] = &[
    ("anthropic", "Anthropic", false),
    ("openai", "OpenAI", false),
    ("gemini", "Google Gemini", false),
    ("deepseek", "DeepSeek", false),
    ("ollama", "Ollama", true),
    ("openai-compatible", "Custom endpoint", false),
    ("minimax", "Minimax", false),
    ("qwen", "Qwen", false),
    ("lmstudio", "LM Studio", true),
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfigPublic {
    pub provider_id: String,
    pub display_name: String,
    pub enabled: bool,
    pub has_secret: bool,
    pub base_url: Option<String>,
    pub default_model: Option<String>,
    pub manual_model: Option<String>,
    pub validated_at: Option<String>,
    pub validation_status: String,
    pub key_fingerprint: Option<String>,
    pub auth_mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProviderInput {
    pub provider_id: String,
    pub enabled: Option<bool>,
    pub base_url: Option<String>,
    pub default_model: Option<String>,
    pub manual_model: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetProviderSecretInput {
    pub provider_id: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub auth_mode: Option<String>,
}

fn seed_providers(conn: &rusqlite::Connection) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    for (id, name, local) in PROVIDERS {
        conn.execute(
            "INSERT OR IGNORE INTO provider_configs
             (provider_id, display_name, enabled, base_url, validation_status, updated_at)
             VALUES (?1, ?2, ?3, ?4, 'unknown', ?5)",
            params![
                id,
                name,
                if *local { 1 } else { 0 },
                if *id == "ollama" {
                    Some("http://127.0.0.1:11434")
                } else if *id == "lmstudio" {
                    Some("http://127.0.0.1:1234")
                } else {
                    None::<&str>
                },
                now
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn init_provider_tables(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS provider_configs (
            provider_id TEXT PRIMARY KEY NOT NULL,
            display_name TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 0,
            base_url TEXT,
            default_model TEXT,
            manual_model TEXT,
            validation_status TEXT NOT NULL DEFAULT 'unknown',
            validated_at TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pricing_cache (
            provider_id TEXT NOT NULL,
            model_id TEXT NOT NULL,
            display_name TEXT,
            input_per_million REAL,
            output_per_million REAL,
            currency TEXT NOT NULL DEFAULT 'USD',
            source TEXT NOT NULL DEFAULT 'auto',
            updated_at TEXT NOT NULL,
            PRIMARY KEY (provider_id, model_id)
        );
        CREATE TABLE IF NOT EXISTS task_usage (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT,
            provider_id TEXT NOT NULL,
            model_id TEXT NOT NULL,
            input_tokens INTEGER,
            output_tokens INTEGER,
            estimated_cost_usd REAL,
            routing_policy TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())?;
    seed_providers(conn)
}

fn read_provider_row(
    conn: &rusqlite::Connection,
    vault: &VaultState,
) -> Result<Vec<ProviderConfigPublic>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT provider_id, display_name, enabled, base_url, default_model, manual_model,
                    validation_status, validated_at
             FROM provider_configs ORDER BY provider_id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, Option<String>>(7)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        let (
            provider_id,
            display_name,
            enabled,
            base_url,
            default_model,
            manual_model,
            validation_status,
            validated_at,
        ) = row.map_err(|e| e.to_string())?;
        let secret = vault.get_secret(&provider_id);
        let has_secret = vault.has_secret(&provider_id);
        let key_fingerprint = secret
            .as_ref()
            .and_then(|s| s.api_key.as_ref())
            .map(|k| derive_fingerprint(k));
        let auth_mode = secret.as_ref().and_then(|s| s.auth_mode.clone());
        out.push(ProviderConfigPublic {
            provider_id,
            display_name,
            enabled: enabled != 0,
            has_secret,
            base_url,
            default_model,
            manual_model,
            validated_at,
            validation_status,
            key_fingerprint,
            auth_mode,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn list_providers(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
) -> Result<Vec<ProviderConfigPublic>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    read_provider_row(&conn, &vault)
}

#[tauri::command]
pub fn update_provider(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    input: UpdateProviderInput,
) -> Result<Vec<ProviderConfigPublic>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(enabled) = input.enabled {
        conn.execute(
            "UPDATE provider_configs SET enabled = ?1, updated_at = ?2 WHERE provider_id = ?3",
            params![if enabled { 1 } else { 0 }, now, input.provider_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if input.base_url.is_some() {
        conn.execute(
            "UPDATE provider_configs SET base_url = ?1, updated_at = ?2 WHERE provider_id = ?3",
            params![input.base_url, now, input.provider_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if input.default_model.is_some() {
        conn.execute(
            "UPDATE provider_configs SET default_model = ?1, updated_at = ?2 WHERE provider_id = ?3",
            params![input.default_model, now, input.provider_id],
        )
        .map_err(|e| e.to_string())?;
    }
    if input.manual_model.is_some() {
        conn.execute(
            "UPDATE provider_configs SET manual_model = ?1, updated_at = ?2 WHERE provider_id = ?3",
            params![input.manual_model, now, input.provider_id],
        )
        .map_err(|e| e.to_string())?;
    }
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    read_provider_row(&conn, &vault)
}

#[tauri::command]
pub fn set_provider_secret(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    input: SetProviderSecretInput,
) -> Result<Vec<ProviderConfigPublic>, String> {
    {
        let mut vault = vault.0.lock().map_err(|e| e.to_string())?;
        vault.set_secret(
            &input.provider_id,
            input.api_key.clone(),
            input.base_url.clone(),
            input.auth_mode.clone(),
        )?;
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    if input.base_url.is_some() {
        conn.execute(
            "UPDATE provider_configs SET base_url = ?1, updated_at = ?2 WHERE provider_id = ?3",
            params![input.base_url, now, input.provider_id],
        )
        .map_err(|e| e.to_string())?;
    }
    let has_key = input.provider_id == "ollama"
        || input.provider_id == "lmstudio"
        || input
            .api_key
            .as_ref()
            .is_some_and(|k| !k.trim().is_empty());
    if has_key {
        conn.execute(
            "UPDATE provider_configs SET enabled = 1, updated_at = ?1 WHERE provider_id = ?2",
            params![now, input.provider_id],
        )
        .map_err(|e| e.to_string())?;
    }
    conn.execute(
        "UPDATE provider_configs SET validation_status = 'unknown', validated_at = NULL, updated_at = ?1
         WHERE provider_id = ?2",
        params![now, input.provider_id],
    )
    .map_err(|e| e.to_string())?;
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    read_provider_row(&conn, &vault)
}

#[tauri::command]
pub fn clear_provider_secret(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    provider_id: String,
) -> Result<Vec<ProviderConfigPublic>, String> {
    {
        let mut vault = vault.0.lock().map_err(|e| e.to_string())?;
        vault.clear_secret(&provider_id)?;
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE provider_configs SET enabled = 0, validation_status = 'unknown', validated_at = NULL, updated_at = ?1
         WHERE provider_id = ?2",
        params![now, provider_id],
    )
    .map_err(|e| e.to_string())?;
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    read_provider_row(&conn, &vault)
}

fn codex_home() -> Option<std::path::PathBuf> {
    if let Ok(home) = std::env::var("CODEX_HOME") {
        return Some(std::path::PathBuf::from(home));
    }
    if let Ok(home) = std::env::var("USERPROFILE") {
        return Some(std::path::PathBuf::from(home).join(".codex"));
    }
    std::env::var("HOME").ok().map(|h| std::path::PathBuf::from(h).join(".codex"))
}

fn codex_auth_path() -> Option<std::path::PathBuf> {
    codex_home().map(|h| h.join("auth.json"))
}

#[derive(Debug, Clone)]
struct CodexAuthBundle {
    access_token: String,
    account_id: Option<String>,
    refresh_token: Option<String>,
}

fn parse_codex_auth(json: &serde_json::Value) -> Option<CodexAuthBundle> {
    if let Some(api_key) = json
        .get("OPENAI_API_KEY")
        .or_else(|| json.get("openai_api_key"))
        .and_then(|v| v.as_str())
    {
        if !api_key.trim().is_empty() {
            return Some(CodexAuthBundle {
                access_token: api_key.trim().to_string(),
                account_id: json
                    .get("agent_identity")
                    .and_then(|a| a.get("account_id"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                refresh_token: None,
            });
        }
    }
    let tokens = json.get("tokens")?;
    let access = tokens
        .get("access_token")
        .or_else(|| tokens.get("accessToken"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())?;
    let account_id = tokens
        .get("account_id")
        .or_else(|| tokens.get("accountId"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            json.get("agent_identity")
                .and_then(|a| a.get("account_id"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });
    let refresh_token = tokens
        .get("refresh_token")
        .or_else(|| tokens.get("refreshToken"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    Some(CodexAuthBundle {
        access_token: access.trim().to_string(),
        account_id,
        refresh_token,
    })
}

fn codex_store_key(codex_home: &std::path::Path) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    let canonical = codex_home
        .canonicalize()
        .unwrap_or_else(|_| codex_home.to_path_buf());
    let path_str = canonical.to_string_lossy();
    let mut hasher = Sha256::new();
    hasher.update(path_str.as_bytes());
    let digest = hasher.finalize();
    let hex = format!("{digest:x}");
    let truncated = hex.get(..16).unwrap_or(&hex);
    Ok(format!("cli|{truncated}"))
}

fn read_codex_auth_from_keyring(codex_home: &std::path::Path) -> Option<CodexAuthBundle> {
    let key = codex_store_key(codex_home).ok()?;
    let entry = keyring::Entry::new("Codex Auth", &key).ok()?;
    let raw = entry.get_password().ok()?;
    let json: serde_json::Value = serde_json::from_str(&raw).ok()?;
    parse_codex_auth(&json)
}

fn read_codex_auth_from_file(path: &std::path::Path) -> Option<CodexAuthBundle> {
    let raw = std::fs::read_to_string(path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&raw).ok()?;
    parse_codex_auth(&json)
}

fn ensure_codex_file_storage() -> Result<std::path::PathBuf, String> {
    let home = codex_home().ok_or("Cannot locate Codex home directory.")?;
    std::fs::create_dir_all(&home).map_err(|e| e.to_string())?;
    let config_path = home.join("config.toml");
    let mut contents = if config_path.exists() {
        std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };
    if !contents.contains("cli_auth_credentials_store") {
        if !contents.is_empty() && !contents.ends_with('\n') {
            contents.push('\n');
        }
        contents.push_str("\ncli_auth_credentials_store = \"file\"\n");
        std::fs::write(&config_path, contents).map_err(|e| e.to_string())?;
    }
    Ok(home)
}

fn try_read_codex_auth_bundle() -> Option<CodexAuthBundle> {
    let home = codex_home()?;
    if let Some(path) = codex_auth_path() {
        if path.exists() {
            if let Some(bundle) = read_codex_auth_from_file(&path) {
                return Some(bundle);
            }
        }
    }
    read_codex_auth_from_keyring(&home)
}

fn read_codex_auth_bundle() -> Result<CodexAuthBundle, String> {
    try_read_codex_auth_bundle().ok_or_else(|| {
        let path = codex_auth_path()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|| "~/.codex/auth.json".into());
        format!(
            "No Codex login found (checked auth file and OS keyring). Complete sign-in in the browser, then try Connect again. Expected: {path}"
        )
    })
}

const SIDECAR_URL: &str = "http://127.0.0.1:47821";

fn has_vault_codex_credentials(vault: &VaultHandle) -> bool {
    let vault = match vault.0.lock() {
        Ok(v) => v,
        Err(_) => return false,
    };
    match vault.get_secret("openai") {
        Some(entry) => {
            entry.auth_mode.as_deref() == Some("codex-account")
                && entry
                    .api_key
                    .as_ref()
                    .map(|k| !k.trim().is_empty())
                    .unwrap_or(false)
        }
        None => false,
    }
}

async fn sidecar_post_json(path: &str) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;
    let res = authorized_reqwest(
        client.post(format!("{SIDECAR_URL}{path}")),
        "aura-agent",
    )
        .header("Content-Type", "application/json")
        .body("{}")
        .send()
        .await
        .map_err(|e| {
            format!(
                "Agent sidecar is not running on {SIDECAR_URL}. Restart Aura Work. ({e})"
            )
        })?;
    let status = res.status();
    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(body
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Sidecar request failed")
            .to_string());
    }
    Ok(body)
}

fn bundle_from_sidecar_tokens(tokens: &serde_json::Value) -> Option<CodexAuthBundle> {
    let access = tokens
        .get("accessToken")
        .or_else(|| tokens.get("access_token"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())?;
    let refresh = tokens
        .get("refreshToken")
        .or_else(|| tokens.get("refresh_token"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let account_id = tokens
        .get("accountId")
        .or_else(|| tokens.get("account_id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    Some(CodexAuthBundle {
        access_token: access.trim().to_string(),
        account_id,
        refresh_token: refresh,
    })
}

fn store_codex_bundle(
    db: &DbState,
    vault: &VaultHandle,
    bundle: CodexAuthBundle,
) -> Result<Vec<ProviderConfigPublic>, String> {
    {
        let mut vault = vault.0.lock().map_err(|e| e.to_string())?;
        vault.set_codex_credentials(
            "openai",
            bundle.access_token,
            bundle.account_id,
            bundle.refresh_token,
        )?;
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE provider_configs SET enabled = 1, validation_status = 'unknown', validated_at = NULL, updated_at = ?1
         WHERE provider_id = 'openai'",
        params![now],
    )
    .map_err(|e| e.to_string())?;
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    read_provider_row(&conn, &vault)
}

fn persist_codex_credentials_json(
    vault: &VaultHandle,
    updated: &serde_json::Value,
) -> Result<(), String> {
    let access = updated
        .get("apiKey")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty());
    let Some(access) = access else {
        return Ok(());
    };
    let account_id = updated
        .get("accountId")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let refresh = updated
        .get("refreshToken")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let mut v = vault.0.lock().map_err(|e| e.to_string())?;
    v.set_codex_credentials("openai", access.trim().to_string(), account_id, refresh)
}

async fn verify_openai_codex(vault: &VaultHandle, db: &DbState) -> Result<bool, String> {
    if !has_vault_codex_credentials(vault) {
        return Ok(false);
    }
    let creds = {
        let v = vault.0.lock().map_err(|e| e.to_string())?;
        let secret = v.get_secret("openai").ok_or("No OpenAI credentials.")?;
        let (_, base_url, _, _) = provider_row(db, "openai")?;
        serde_json::json!({
            "apiKey": secret.api_key,
            "baseUrl": base_url.or(secret.base_url),
            "authMode": secret.auth_mode,
            "accountId": secret.codex_account_id,
            "refreshToken": secret.refresh_token,
        })
    };
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;
    let res = authorized_reqwest(
        client.post(format!("{SIDECAR_URL}/providers/validate")),
        "aura-agent",
    )
        .json(&serde_json::json!({
            "providerId": "openai",
            "credentials": creds,
        }))
        .send()
        .await
        .map_err(|e| format!("Agent sidecar unreachable: {e}"))?;
    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    if let Some(updated) = body.get("updatedCredentials") {
        let _ = persist_codex_credentials_json(vault, updated);
    }
    Ok(body.get("valid").and_then(|v| v.as_bool()) == Some(true))
}

async fn try_sync_and_verify_codex(db: &DbState, vault: &VaultHandle) -> Result<bool, String> {
    if let Some(bundle) = try_read_codex_auth_bundle() {
        let _ = store_codex_bundle(db, vault, bundle);
    }
    verify_openai_codex(vault, db).await
}

async fn begin_codex_device_login(
    vault: &VaultHandle,
    db: &DbState,
    force: bool,
) -> Result<serde_json::Value, String> {
    if !force && try_sync_and_verify_codex(db, vault).await? {
        return Ok(serde_json::json!({ "status": "already_authenticated" }));
    }

    if has_vault_codex_credentials(vault) {
        let mut v = vault.0.lock().map_err(|e| e.to_string())?;
        v.clear_secret("openai")?;
    }

    let body = sidecar_post_json("/codex/login/start").await?;
    Ok(serde_json::json!({
        "status": "started",
        "mode": body.get("mode").and_then(|v| v.as_str()).unwrap_or("browser"),
        "userCode": body.get("userCode").and_then(|v| v.as_str()).unwrap_or(""),
        "url": body.get("url").and_then(|v| v.as_str()).unwrap_or(CODEX_DEVICE_LOGIN_URL),
    }))
}

async fn poll_codex_device_login(
    db: &DbState,
    vault: &VaultHandle,
) -> Result<serde_json::Value, String> {
    let body = sidecar_post_json("/codex/login/poll").await?;
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("waiting");

    if status == "failed" {
        return Err(
            body.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("ChatGPT sign-in failed. Click Connect again.")
                .to_string(),
        );
    }

    if status == "success" {
        if let Some(tokens) = body.get("tokens") {
            if let Some(bundle) = bundle_from_sidecar_tokens(tokens) {
                let providers = store_codex_bundle(db, vault, bundle)?;
                return Ok(serde_json::json!({
                    "status": "connected",
                    "providers": providers,
                }));
            }
        }
        return Err("Login succeeded but tokens were missing.".into());
    }

    if try_sync_and_verify_codex(db, vault).await? {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let v = vault.0.lock().map_err(|e| e.to_string())?;
        let providers = read_provider_row(&conn, &v)?;
        return Ok(serde_json::json!({
            "status": "connected",
            "providers": providers,
        }));
    }

    Ok(serde_json::json!({ "status": "waiting" }))
}

#[tauri::command]
pub async fn start_codex_login(
    app: AppHandle,
    vault: State<'_, VaultHandle>,
    db: State<'_, DbState>,
    force: Option<bool>,
) -> Result<serde_json::Value, String> {
    start_codex_device_login(app, vault, db, force).await
}

/// Starts native device-code login (OpenCode-style) via agent sidecar.
#[tauri::command]
pub async fn start_codex_device_login(
    app: AppHandle,
    vault: State<'_, VaultHandle>,
    db: State<'_, DbState>,
    force: Option<bool>,
) -> Result<serde_json::Value, String> {
    let force_login = force.unwrap_or(false);
    let result = begin_codex_device_login(&vault, &db, force_login).await?;
    if result.get("status").and_then(|v| v.as_str()) == Some("started") {
        let url = result
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or(CODEX_DEVICE_LOGIN_URL);
        open_external_url(&app, url)?;
    }
    Ok(result)
}

/// Opens the ChatGPT device sign-in page in the default browser.
#[tauri::command]
pub fn open_codex_login_page(app: AppHandle, url: Option<String>) -> Result<(), String> {
    open_external_url(&app, url.as_deref().unwrap_or(CODEX_DEVICE_LOGIN_URL))
}

/// Poll once for completed device login; stores credentials when found.
#[tauri::command]
pub async fn poll_codex_login(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
) -> Result<serde_json::Value, String> {
    poll_codex_device_login(&db, &vault).await
}

#[tauri::command]
pub async fn login_codex_account(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
) -> Result<Vec<ProviderConfigPublic>, String> {
    use tokio::time::{sleep, Duration};

    if let Some(bundle) = try_read_codex_auth_bundle() {
        let _ = store_codex_bundle(&db, &vault, bundle);
    }

    if try_sync_and_verify_codex(&db, &vault).await? {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let v = vault.0.lock().map_err(|e| e.to_string())?;
        return read_provider_row(&conn, &v);
    }

    begin_codex_device_login(&vault, &db, false).await?;

    for _ in 0..90 {
        sleep(Duration::from_secs(2)).await;
        let poll = poll_codex_device_login(&db, &vault).await?;
        if poll.get("status").and_then(|v| v.as_str()) == Some("connected") {
            if let Some(arr) = poll.get("providers") {
                return serde_json::from_value(arr.clone())
                    .map_err(|e| format!("Invalid provider list: {e}"));
            }
            let conn = db.0.lock().map_err(|e| e.to_string())?;
            let v = vault.0.lock().map_err(|e| e.to_string())?;
            return read_provider_row(&conn, &v);
        }
    }

    Err("Device sign-in timed out. Open the link, enter the code, then click Connect again.".into())
}

#[tauri::command]
pub fn connect_codex_account(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
) -> Result<Vec<ProviderConfigPublic>, String> {
    let bundle = read_codex_auth_bundle()?;
    store_codex_bundle(&db, &vault, bundle)
}

fn store_oauth_bundle(
    db: &DbState,
    vault: &VaultHandle,
    provider_id: &str,
    bundle: CodexAuthBundle,
) -> Result<Vec<ProviderConfigPublic>, String> {
    let auth_mode = match provider_id {
        "openai" => "codex-account",
        "gemini" => "google-account",
        "anthropic" => "claude-account",
        _ => "api-key",
    };
    {
        let mut vault = vault.0.lock().map_err(|e| e.to_string())?;
        vault.set_oauth_credentials(
            provider_id,
            bundle.access_token,
            bundle.account_id,
            bundle.refresh_token,
            auth_mode,
        )?;
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE provider_configs SET enabled = 1, validation_status = 'unknown', validated_at = NULL, updated_at = ?1
         WHERE provider_id = ?2",
        params![now, provider_id],
    )
    .map_err(|e| e.to_string())?;
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    read_provider_row(&conn, &vault)
}

async fn begin_provider_oauth_login(
    vault: &VaultHandle,
    _db: &DbState,
    provider_id: &str,
) -> Result<serde_json::Value, String> {
    let has_credentials = {
        let vault = match vault.0.lock() {
            Ok(v) => v,
            Err(_) => return Err("Vault locked".to_string()),
        };
        match vault.get_secret(provider_id) {
            Some(entry) => {
                let is_oauth = entry.auth_mode.as_deref() == Some("codex-account")
                    || entry.auth_mode.as_deref() == Some("google-account")
                    || entry.auth_mode.as_deref() == Some("claude-account");
                is_oauth && entry.api_key.as_ref().map(|k| !k.trim().is_empty()).unwrap_or(false)
            }
            None => false,
        }
    };

    if has_credentials {
        let mut v = vault.0.lock().map_err(|e| e.to_string())?;
        v.clear_secret(provider_id)?;
    }

    let path = match provider_id {
        "gemini" => "/google/login/start",
        "anthropic" => "/claude/login/start",
        _ => "/codex/login/start",
    };

    let body = sidecar_post_json(path).await?;
    Ok(serde_json::json!({
        "status": "started",
        "mode": body.get("mode").and_then(|v| v.as_str()).unwrap_or("browser"),
        "userCode": body.get("userCode").and_then(|v| v.as_str()).unwrap_or(""),
        "url": body.get("url").and_then(|v| v.as_str()).unwrap_or(CODEX_DEVICE_LOGIN_URL),
    }))
}

async fn poll_provider_oauth_login_helper(
    db: &DbState,
    vault: &VaultHandle,
    provider_id: &str,
) -> Result<serde_json::Value, String> {
    let path = match provider_id {
        "gemini" => "/google/login/poll",
        "anthropic" => "/claude/login/poll",
        _ => "/codex/login/poll",
    };
    let body = sidecar_post_json(path).await?;
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("waiting");

    if status == "failed" {
        return Err(
            body.get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("Sign-in failed. Click Connect again.")
                .to_string(),
        );
    }

    if status == "success" {
        if let Some(tokens) = body.get("tokens") {
            if let Some(bundle) = bundle_from_sidecar_tokens(tokens) {
                let providers = store_oauth_bundle(db, vault, provider_id, bundle)?;
                return Ok(serde_json::json!({
                    "status": "connected",
                    "providers": providers,
                }));
            }
        }
    }

    Ok(serde_json::json!({ "status": "waiting" }))
}

#[tauri::command]
pub async fn start_provider_oauth_login(
    app: AppHandle,
    vault: State<'_, VaultHandle>,
    db: State<'_, DbState>,
    provider_id: String,
) -> Result<serde_json::Value, String> {
    let result = begin_provider_oauth_login(&vault, &db, &provider_id).await?;
    if result.get("status").and_then(|v| v.as_str()) == Some("started") {
        let url = result
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or(CODEX_DEVICE_LOGIN_URL);
        open_external_url(&app, url)?;
    }
    Ok(result)
}

#[tauri::command]
pub async fn poll_provider_oauth_login(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    provider_id: String,
) -> Result<serde_json::Value, String> {
    poll_provider_oauth_login_helper(&db, &vault, &provider_id).await
}

#[tauri::command]
pub fn get_routing_policy(db: State<'_, DbState>) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let policy: Option<String> = conn
        .query_row(
            "SELECT value FROM app_settings WHERE key = 'routing_policy'",
            [],
            |r| r.get(0),
        )
        .ok();
    Ok(policy.unwrap_or_else(|| "quality-first".into()))
}

#[tauri::command]
pub fn set_routing_policy(db: State<'_, DbState>, policy: String) -> Result<String, String> {
    let allowed = [
        "quality-first",
        "cost-first",
        "privacy-first",
        "local-only",
        "manual",
    ];
    if !allowed.contains(&policy.as_str()) {
        return Err("Invalid routing policy.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES ('routing_policy', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![policy],
    )
    .map_err(|e| e.to_string())?;
    Ok(policy)
}

#[tauri::command]
pub fn get_vault_status(vault: State<'_, VaultHandle>) -> Result<serde_json::Value, String> {
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    Ok(vault.status())
}

#[tauri::command]
pub fn export_vault(vault: State<'_, VaultHandle>, password: String) -> Result<String, String> {
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    let bytes = vault.export(&password)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

#[tauri::command]
pub fn import_vault(
    vault: State<'_, VaultHandle>,
    password: String,
    data_base64: String,
) -> Result<serde_json::Value, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64)
        .map_err(|e| e.to_string())?;
    let mut vault = vault.0.lock().map_err(|e| e.to_string())?;
    vault.import(&bytes, &password)?;
    Ok(vault.status())
}

pub fn mark_provider_validation(
    db: &DbState,
    provider_id: &str,
    status: &str,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE provider_configs SET validation_status = ?1, validated_at = ?2, updated_at = ?2
         WHERE provider_id = ?3",
        params![status, now, provider_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn provider_row(
    db: &DbState,
    provider_id: &str,
) -> Result<(bool, Option<String>, Option<String>, Option<String>), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT enabled, base_url, default_model, manual_model FROM provider_configs WHERE provider_id = ?1",
        params![provider_id],
        |row| {
            Ok((
                row.get::<_, i64>(0)? != 0,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
            ))
        },
    )
    .map_err(|_| "Provider not found.".to_string())
}
