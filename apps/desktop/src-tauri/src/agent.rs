use crate::db::DbState;
use crate::sidecar_auth::authorized_reqwest;
use crate::pricing::{estimate_cost, pricing_for_model};
use crate::providers::{VaultHandle, mark_provider_validation, provider_row};
use crate::vault::ProviderSecret;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

const SIDECAR_URL: &str = "http://127.0.0.1:47821";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageInput {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunChatInput {
    pub project_id: Option<String>,
    pub message: String,
    pub task_type: Option<String>,
    pub preferred_provider: Option<String>,
    pub preferred_model: Option<String>,
    pub messages: Option<Vec<ChatMessageInput>>,
    pub fallback_approved: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatResult {
    pub text: String,
    pub provider_id: String,
    pub model_id: String,
    pub routing_policy: String,
    pub routing_reason: String,
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub estimated_cost_usd: Option<f64>,
    pub cost_unknown: bool,
    pub usage_id: String,
    pub requires_fallback_approval: bool,
    pub fallback_from: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskUsageRecord {
    pub id: String,
    pub project_id: Option<String>,
    pub provider_id: String,
    pub model_id: String,
    pub input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub estimated_cost_usd: Option<f64>,
    pub routing_policy: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
struct SidecarHealth {
    status: String,
    phase: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarRouteResponse {
    provider_id: String,
    model_id: String,
    reason: String,
    requires_approval: Option<bool>,
    fallback_from: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarChatResponse {
    text: String,
    usage: SidecarUsage,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarUsage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    estimated_cost_usd: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarValidateResponse {
    valid: bool,
    message: Option<String>,
    updated_credentials: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarModelsResponse {
    models: Vec<SidecarModelInfo>,
    updated_credentials: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarModelInfo {
    id: String,
    display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderModelPublic {
    pub id: String,
    pub display_name: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetProviderModelEnabledInput {
    pub provider_id: String,
    pub model_id: String,
    pub enabled: bool,
}

pub async fn sidecar_post<T: for<'de> Deserialize<'de>>(
    path: &str,
    body: &serde_json::Value,
) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{SIDECAR_URL}{path}");
    let mut last_err = String::new();

    for attempt in 0..24 {
        match authorized_reqwest(client.post(&url), "aura-agent").json(body).send().await {
            Ok(resp) if resp.status().is_success() => {
                return resp.json::<T>().await.map_err(|e| e.to_string());
            }
            Ok(resp) => {
                let status = resp.status();
                let err = resp.text().await.unwrap_or_else(|_| "Sidecar error".into());
                if status == reqwest::StatusCode::UNAUTHORIZED && err.contains("Unauthorized") {
                    return Err(
                        "Agent sidecar authorization is stale. Restart Aura Work and try again."
                            .into(),
                    );
                }
                return Err(err);
            }
            Err(e) => {
                last_err = e.to_string();
                if attempt < 23 {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    continue;
                }
            }
        }
    }

    Err(format!(
        "Agent sidecar is not responding on {SIDECAR_URL}. {last_err}. \
         Restart the app or run: npm run sidecar"
    ))
}

pub async fn sidecar_get_text(path: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{SIDECAR_URL}{path}");
    let resp = authorized_reqwest(client.get(&url), "aura-agent")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Ok(String::new());
    }
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(body
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string())
}

pub fn enabled_providers(db: &DbState, vault: &VaultHandle) -> Result<Vec<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT provider_id FROM provider_configs WHERE enabled = 1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for row in rows {
        let id = row.map_err(|e| e.to_string())?;
        if vault.has_secret(&id) {
            out.push(id);
        }
    }
    Ok(out)
}

fn build_credentials(
    vault: &VaultHandle,
    db: &DbState,
    provider_id: &str,
) -> Result<serde_json::Value, String> {
    let vault = vault.0.lock().map_err(|e| e.to_string())?;
    if !vault.has_secret(provider_id) {
        return Err(format!("No credentials for {provider_id}"));
    }
    let secret = vault.get_secret(provider_id).unwrap_or_default();
    let (_, base_url, _, _) = provider_row(db, provider_id)?;
    Ok(serde_json::json!({
        "apiKey": secret.api_key,
        "baseUrl": base_url.or(secret.base_url),
        "authMode": secret.auth_mode,
        "accountId": secret.codex_account_id,
        "refreshToken": secret.refresh_token,
    }))
}

pub fn record_usage(
    db: &DbState,
    project_id: Option<&str>,
    provider_id: &str,
    model_id: &str,
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    estimated_cost_usd: Option<f64>,
    routing_policy: &str,
) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO task_usage
         (id, project_id, provider_id, model_id, input_tokens, output_tokens, estimated_cost_usd, routing_policy, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            project_id,
            provider_id,
            model_id,
            input_tokens.map(|v| v as i64),
            output_tokens.map(|v| v as i64),
            estimated_cost_usd,
            routing_policy,
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub async fn get_sidecar_status() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    match authorized_reqwest(client.get(format!("{SIDECAR_URL}/health")), "aura-agent")
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            let health: SidecarHealth = resp.json().await.map_err(|e| e.to_string())?;
            Ok(serde_json::json!({
                "running": true,
                "phase": health.phase,
                "status": health.status,
            }))
        }
        _ => Ok(serde_json::json!({
            "running": false,
            "phase": 2,
            "message": "Start sidecar: npm run sidecar"
        })),
    }
}

pub fn persist_oauth_credentials_from_json(
    vault: &VaultHandle,
    provider_id: &str,
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
    let auth_mode = match provider_id {
        "openai" => "codex-account",
        "gemini" => "google-account",
        "anthropic" => "claude-account",
        _ => "api-key",
    };
    let mut v = vault.0.lock().map_err(|e| e.to_string())?;
    v.set_oauth_credentials(provider_id, access.trim().to_string(), account_id, refresh, auth_mode)
}

fn persist_codex_credentials_from_json(
    vault: &VaultHandle,
    updated: &serde_json::Value,
) -> Result<(), String> {
    persist_oauth_credentials_from_json(vault, "openai", updated)
}

#[tauri::command]
pub async fn validate_provider(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    provider_id: String,
) -> Result<serde_json::Value, String> {
    let creds = build_credentials(&vault, &db, &provider_id)?;
    let result: SidecarValidateResponse = sidecar_post(
        "/providers/validate",
        &serde_json::json!({ "providerId": provider_id, "credentials": creds }),
    )
    .await?;
    if let Some(updated) = &result.updated_credentials {
        let _ = persist_oauth_credentials_from_json(&vault, &provider_id, updated);
    }
    let status = if result.valid { "valid" } else { "invalid" };
    mark_provider_validation(&db, &provider_id, status)?;
    Ok(serde_json::json!({
        "valid": result.valid,
        "message": result.message,
        "status": status,
    }))
}

async fn fetch_provider_models(
    vault: &VaultHandle,
    db: &DbState,
    provider_id: &str,
) -> Result<Vec<SidecarModelInfo>, String> {
    let creds = build_credentials(vault, db, provider_id)?;
    let result: SidecarModelsResponse = sidecar_post(
        "/providers/models",
        &serde_json::json!({ "providerId": provider_id, "credentials": creds }),
    )
    .await?;
    if let Some(updated) = &result.updated_credentials {
        persist_codex_credentials_from_json(vault, updated)?;
    }
    Ok(result.models)
}

fn sync_model_visibility(
    db: &DbState,
    provider_id: &str,
    models: &[SidecarModelInfo],
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    for model in models {
        conn.execute(
            "INSERT OR IGNORE INTO provider_model_visibility
             (provider_id, model_id, enabled, updated_at)
             VALUES (?1, ?2, 1, ?3)",
            params![provider_id, model.id, now],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn is_model_enabled(db: &DbState, provider_id: &str, model_id: &str) -> Result<bool, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let enabled: Option<i64> = conn
        .query_row(
            "SELECT enabled FROM provider_model_visibility WHERE provider_id = ?1 AND model_id = ?2",
            params![provider_id, model_id],
            |row| row.get(0),
        )
        .ok();
    Ok(enabled.unwrap_or(1) != 0)
}

fn to_provider_model_public(
    db: &DbState,
    provider_id: &str,
    model: SidecarModelInfo,
) -> Result<ProviderModelPublic, String> {
    let enabled = is_model_enabled(db, provider_id, &model.id)?;
    let display_name = model.display_name.unwrap_or_else(|| model.id.clone());
    Ok(ProviderModelPublic {
        id: model.id,
        display_name,
        enabled,
    })
}

#[tauri::command]
pub async fn list_provider_models(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    provider_id: String,
) -> Result<Vec<ProviderModelPublic>, String> {
    let result = fetch_provider_models(&vault, &db, &provider_id).await?;
    sync_model_visibility(&db, &provider_id, &result)?;
    if !result.is_empty() {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let ids: std::collections::HashSet<String> = result.iter().map(|m| m.id.clone()).collect();
        let current: Option<String> = conn
            .query_row(
                "SELECT default_model FROM provider_configs WHERE provider_id = ?1",
                params![provider_id],
                |r| r.get(0),
            )
            .ok()
            .flatten();
        let should_update = current
            .as_ref()
            .is_none_or(|m| m.trim().is_empty() || !ids.contains(m.trim()));
        if should_update {
            let first = &result[0].id;
            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                "UPDATE provider_configs SET default_model = ?1, updated_at = ?2 WHERE provider_id = ?3",
                params![first, now, provider_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    result
        .into_iter()
        .map(|m| to_provider_model_public(&db, &provider_id, m))
        .collect()
}

#[tauri::command]
pub fn set_provider_model_enabled(
    db: State<'_, DbState>,
    input: SetProviderModelEnabledInput,
) -> Result<(), String> {
    if input.provider_id.trim().is_empty() || input.model_id.trim().is_empty() {
        return Err("Provider and model are required.".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO provider_model_visibility (provider_id, model_id, enabled, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(provider_id, model_id) DO UPDATE SET
           enabled = excluded.enabled,
           updated_at = excluded.updated_at",
        params![
            input.provider_id,
            input.model_id,
            if input.enabled { 1 } else { 0 },
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_chat_models(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
) -> Result<Vec<serde_json::Value>, String> {
    let allowed = enabled_providers(&db, &vault)?;
    let mut out = Vec::new();
    for pid in allowed {
        let models = match fetch_provider_models(&vault, &db, &pid).await {
            Ok(m) => m,
            Err(_) => {
                let (_, _, default_model, manual_model) = provider_row(&db, &pid)?;
                manual_model
                    .or(default_model)
                    .map(|m| SidecarModelInfo {
                        id: m.clone(),
                        display_name: Some(m),
                    })
                    .into_iter()
                    .collect()
            }
        };
        for m in models {
            if !is_model_enabled(&db, &pid, &m.id)? {
                continue;
            }
            let label = format!(
                "{} — {}",
                pid,
                m.display_name.unwrap_or_else(|| m.id.clone())
            );
            out.push(serde_json::json!({
                "providerId": pid,
                "modelId": m.id,
                "label": label,
            }));
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn run_chat(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    input: RunChatInput,
) -> Result<ChatResult, String> {
    if input.message.trim().is_empty() {
        return Err("Message is required.".into());
    }
    if input
        .project_id
        .as_deref()
        .is_some_and(|project_id| !project_id.trim().is_empty())
    {
        return crate::tasks::run_workspace_chat_agent(&db, &vault, &input).await;
    }

    let routing_policy = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT value FROM app_settings WHERE key = 'routing_policy'",
            [],
            |r| r.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "quality-first".into())
    };
    let allowed = enabled_providers(&db, &vault)?;
    if allowed.is_empty() {
        return Err("Enable at least one provider (Ollama and LM Studio work without an API key).".into());
    }

    let pricing = crate::pricing::list_pricing_models(&db)?;
    let pricing_json: Vec<serde_json::Value> = pricing
        .iter()
        .map(|p| {
            serde_json::json!({
                "providerId": p.provider_id,
                "modelId": p.model_id,
                "displayName": p.display_name,
                "inputPerMillion": p.input_per_million,
                "outputPerMillion": p.output_per_million,
            })
        })
        .collect();

    let mut chat_messages: Vec<serde_json::Value> = if let Some(msgs) = &input.messages {
        if msgs.is_empty() {
            return Err("Message is required.".into());
        }
        msgs.iter()
            .map(|m| {
                serde_json::json!({
                    "role": m.role,
                    "content": m.content,
                })
            })
            .collect()
    } else {
        vec![serde_json::json!({
            "role": "user",
            "content": input.message.trim(),
        })]
    };
    let has_system = chat_messages
        .iter()
        .any(|m| m.get("role").and_then(|v| v.as_str()) == Some("system"));
    if !has_system {
        chat_messages.insert(
            0,
            serde_json::json!({
                "role": "system",
                "content": "You are Aura Work's assistant inside the Aura Work desktop app. Reply in the same language as the user's latest message. If asked who you are, answer as Aura Work and explain that you can help with project work, providers, usage, and app guidance. Keep answers concise."
            }),
        );
    }

    let (provider_id, model_id, routing_reason, fallback_from, requires_fallback) =
        if let (Some(p), Some(m)) = (&input.preferred_provider, &input.preferred_model) {
            if !allowed.iter().any(|a| a == p) {
                return Err(format!(
                    "Provider {p} is not enabled or missing credentials."
                ));
            }
            (
                p.clone(),
                m.clone(),
                "User-selected model.".into(),
                None,
                false,
            )
        } else {
            let route: SidecarRouteResponse = sidecar_post(
                "/route",
                &serde_json::json!({
                    "policy": routing_policy,
                    "context": {
                        "taskType": input.task_type.unwrap_or_else(|| "general".into()),
                        "sensitivity": "normal",
                        "allowedProviders": allowed,
                        "userPreferredModel": null
                    },
                    "pricing": pricing_json,
                    "configs": list_provider_configs(&db)?
                }),
            )
            .await?;
            let needs_approval =
                route.requires_approval.unwrap_or(false) && !input.fallback_approved.unwrap_or(false);
            (
                route.provider_id,
                route.model_id,
                route.reason,
                route.fallback_from,
                needs_approval,
            )
        };

    if requires_fallback {
        return Ok(ChatResult {
            text: String::new(),
            provider_id: provider_id.clone(),
            model_id: model_id.clone(),
            routing_policy: routing_policy.clone(),
            routing_reason: routing_reason.clone(),
            input_tokens: None,
            output_tokens: None,
            estimated_cost_usd: None,
            cost_unknown: true,
            usage_id: String::new(),
            requires_fallback_approval: true,
            fallback_from,
        });
    }

    let creds = build_credentials(&vault, &db, &provider_id)?;
    let chat: SidecarChatResponse = sidecar_post(
        "/chat",
        &serde_json::json!({
            "providerId": provider_id,
            "modelId": model_id,
            "messages": chat_messages,
            "credentials": creds
        }),
    )
    .await?;

    let (input_rate, output_rate) =
        pricing_for_model(&db, &provider_id, &model_id).unwrap_or((None, None));
    let estimated = chat.usage.estimated_cost_usd.or_else(|| {
        estimate_cost(
            chat.usage.input_tokens.unwrap_or(0),
            chat.usage.output_tokens.unwrap_or(0),
            input_rate,
            output_rate,
        )
    });
    let cost_unknown = estimated.is_none()
        && (chat.usage.input_tokens.is_some() || chat.usage.output_tokens.is_some());

    let usage_id = record_usage(
        &db,
        input.project_id.as_deref(),
        &provider_id,
        &model_id,
        chat.usage.input_tokens,
        chat.usage.output_tokens,
        estimated,
        &routing_policy,
    )?;

    Ok(ChatResult {
        text: chat.text,
        provider_id,
        model_id,
        routing_policy,
        routing_reason,
        input_tokens: chat.usage.input_tokens,
        output_tokens: chat.usage.output_tokens,
        estimated_cost_usd: estimated,
        cost_unknown,
        usage_id,
        requires_fallback_approval: false,
        fallback_from,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarChatBundle {
    pub provider_id: String,
    pub model_id: String,
    pub credentials: serde_json::Value,
    pub routing_policy: String,
}

pub async fn build_task_chat_bundle(
    db: &DbState,
    vault: &VaultHandle,
    allowed: &[String],
    task_type: &str,
    preferred_provider: Option<&str>,
    preferred_model: Option<&str>,
    cached_provider: Option<&str>,
    cached_model: Option<&str>,
) -> Result<SidecarChatBundle, String> {
    let routing_policy = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT value FROM app_settings WHERE key = 'routing_policy'",
            [],
            |r| r.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "quality-first".into())
    };

    for (p, m) in [
        (cached_provider, cached_model),
        (preferred_provider, preferred_model),
    ] {
        if let (Some(p), Some(m)) = (p, m) {
            if !p.is_empty() && !m.is_empty() && allowed.iter().any(|a| a == p) {
                let creds = build_credentials(vault, db, p)?;
                return Ok(SidecarChatBundle {
                    provider_id: p.to_string(),
                    model_id: m.to_string(),
                    credentials: creds,
                    routing_policy: routing_policy.clone(),
                });
            }
        }
    }

    build_sidecar_chat(db, vault, allowed, task_type).await
}

pub async fn build_sidecar_chat(
    db: &DbState,
    vault: &VaultHandle,
    allowed: &[String],
    task_type: &str,
) -> Result<SidecarChatBundle, String> {
    let routing_policy = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT value FROM app_settings WHERE key = 'routing_policy'",
            [],
            |r| r.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "quality-first".into())
    };

    let pricing = crate::pricing::list_pricing_models(db)?;
    let pricing_json: Vec<serde_json::Value> = pricing
        .iter()
        .map(|p| {
            serde_json::json!({
                "providerId": p.provider_id,
                "modelId": p.model_id,
                "displayName": p.display_name,
                "inputPerMillion": p.input_per_million,
                "outputPerMillion": p.output_per_million,
            })
        })
        .collect();

    let route: SidecarRouteResponse = sidecar_post(
        "/route",
        &serde_json::json!({
            "policy": routing_policy,
            "context": {
                "taskType": task_type,
                "sensitivity": "normal",
                "allowedProviders": allowed,
                "userPreferredModel": null
            },
            "pricing": pricing_json,
            "configs": list_provider_configs(db)?
        }),
    )
    .await?;

    let creds = build_credentials(vault, db, &route.provider_id)?;
    Ok(SidecarChatBundle {
        provider_id: route.provider_id,
        model_id: route.model_id,
        credentials: creds,
        routing_policy,
    })
}

fn list_provider_configs(db: &DbState) -> Result<Vec<serde_json::Value>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT provider_id, enabled, base_url, default_model, manual_model FROM provider_configs",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "providerId": row.get::<_, String>(0)?,
                "enabled": row.get::<_, i64>(1)? != 0,
                "baseUrl": row.get::<_, Option<String>>(2)?,
                "defaultModel": row.get::<_, Option<String>>(3)?,
                "manualModel": row.get::<_, Option<String>>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_latest_usage(db: State<'_, DbState>, project_id: Option<String>) -> Result<Option<TaskUsageRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = if project_id.is_some() {
        "SELECT id, project_id, provider_id, model_id, input_tokens, output_tokens,
                estimated_cost_usd, routing_policy, created_at
         FROM task_usage WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1"
    } else {
        "SELECT id, project_id, provider_id, model_id, input_tokens, output_tokens,
                estimated_cost_usd, routing_policy, created_at
         FROM task_usage ORDER BY created_at DESC LIMIT 1"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let row = if let Some(pid) = project_id {
        stmt.query_row(params![pid], map_usage_row).ok()
    } else {
        stmt.query_row([], map_usage_row).ok()
    };
    Ok(row)
}

#[tauri::command]
pub fn list_task_usage(db: State<'_, DbState>, project_id: Option<String>) -> Result<Vec<TaskUsageRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = if project_id.is_some() {
        conn.prepare(
            "SELECT id, project_id, provider_id, model_id, input_tokens, output_tokens,
                    estimated_cost_usd, routing_policy, created_at
             FROM task_usage WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?
    } else {
        conn.prepare(
            "SELECT id, project_id, provider_id, model_id, input_tokens, output_tokens,
                    estimated_cost_usd, routing_policy, created_at
             FROM task_usage ORDER BY created_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?
    };
    let rows = if let Some(pid) = project_id {
        stmt.query_map(params![pid], map_usage_row)
    } else {
        stmt.query_map([], map_usage_row)
    }
    .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn map_usage_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TaskUsageRecord> {
    Ok(TaskUsageRecord {
        id: row.get(0)?,
        project_id: row.get(1)?,
        provider_id: row.get(2)?,
        model_id: row.get(3)?,
        input_tokens: row.get(4)?,
        output_tokens: row.get(5)?,
        estimated_cost_usd: row.get(6)?,
        routing_policy: row.get(7)?,
        created_at: row.get(8)?,
    })
}

#[allow(dead_code)]
fn _secret_redacted(secret: &ProviderSecret) -> serde_json::Value {
    serde_json::json!({
        "hasApiKey": secret.api_key.as_ref().is_some_and(|k| !k.is_empty()),
        "baseUrl": secret.base_url,
    })
}

#[tauri::command]
pub fn get_monthly_spending(db: State<'_, DbState>) -> Result<f64, String> {
    use chrono::{Datelike, Timelike};
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now();
    let start_of_month = now
        .with_day(1).unwrap()
        .with_hour(0).unwrap()
        .with_minute(0).unwrap()
        .with_second(0).unwrap()
        .with_nanosecond(0).unwrap()
        .to_rfc3339();

    let mut stmt = conn.prepare(
        "SELECT SUM(estimated_cost_usd) FROM task_usage WHERE created_at >= ?1"
    ).map_err(|e| e.to_string())?;
    
    let sum: Option<f64> = stmt.query_row(params![start_of_month], |row| row.get(0))
        .map_err(|e| e.to_string())?;
        
    Ok(sum.unwrap_or(0.0))
}
