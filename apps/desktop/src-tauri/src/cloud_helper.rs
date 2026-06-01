use crate::sidecar_auth::authorized_reqwest;
use serde::{Deserialize, Serialize};

pub const CLOUD_SYNC_HELPER_URL: &str = "http://127.0.0.1:47825";
pub const DEFAULT_CLOUD_SERVER_URL: &str = "http://127.0.0.1:47830";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudSyncConfigPayload {
    pub server_url: String,
    pub access_token: String,
    pub account_id: String,
    pub device_id: String,
    pub sync_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudSyncStatus {
    pub state: String,
    pub server_url: Option<String>,
    pub account_id: Option<String>,
    pub device_id: Option<String>,
    pub sync_enabled: bool,
    pub last_sync_at: Option<String>,
    pub last_sync_push_count: Option<u32>,
    pub last_sync_pull_count: Option<u32>,
    pub last_error: Option<String>,
    pub dispatch_poll_active: bool,
    pub pending_dispatch_count: u32,
    pub running: bool,
    pub remediation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedSyncEnvelope {
    pub id: String,
    pub owner_account_id: String,
    pub object_type: String,
    pub version: u32,
    pub ciphertext: String,
    pub nonce: String,
    pub key_version: u32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudDeviceInfo {
    pub id: String,
    pub name: String,
    pub device_type: String,
    pub public_key: String,
    pub paired_at: String,
    pub last_seen_at: String,
    pub online: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DispatchPendingItem {
    pub id: String,
    pub source_device_id: String,
    pub ciphertext: String,
    pub nonce: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
struct HelperErrorBody {
    error: String,
}

async fn helper_get<T: for<'de> Deserialize<'de>>(path: &str) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = authorized_reqwest(
        client.get(format!("{CLOUD_SYNC_HELPER_URL}{path}")),
        "aura-cloud-sync",
    )
        .send()
        .await
        .map_err(|_| "Cloud sync helper is not running. Start it with: npm run cloud-sync".to_string())?;
    if !resp.status().is_success() {
        let body: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: "Cloud sync helper error".into(),
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
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = authorized_reqwest(
        client.post(format!("{CLOUD_SYNC_HELPER_URL}{path}")),
        "aura-cloud-sync",
    )
        .json(body)
        .send()
        .await
        .map_err(|_| "Cloud sync helper is not running. Start it with: npm run cloud-sync".to_string())?;
    if !resp.status().is_success() {
        let body: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: "Cloud sync helper error".into(),
        });
        return Err(body.error);
    }
    resp.json().await.map_err(|e| e.to_string())
}

pub async fn get_cloud_sync_status() -> Result<CloudSyncStatus, String> {
    helper_get("/status").await
}

pub async fn start_cloud_sync_helper(config: &CloudSyncConfigPayload) -> Result<CloudSyncStatus, String> {
    helper_post("/start", &serde_json::to_value(config).map_err(|e| e.to_string())?).await
}

pub async fn stop_cloud_sync_helper() -> Result<CloudSyncStatus, String> {
    helper_post("/stop", &serde_json::json!({})).await
}

pub async fn push_sync_envelopes(
    envelopes: &[EncryptedSyncEnvelope],
) -> Result<serde_json::Value, String> {
    helper_post(
        "/sync/push",
        &serde_json::json!({ "envelopes": envelopes }),
    )
    .await
}

pub async fn pull_sync_envelopes(since: Option<&str>) -> Result<Vec<EncryptedSyncEnvelope>, String> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct PullResult {
        envelopes: Vec<EncryptedSyncEnvelope>,
    }
    let result: PullResult = helper_post(
        "/sync/pull",
        &serde_json::json!({ "since": since }),
    )
    .await?;
    Ok(result.envelopes)
}

pub async fn list_pending_dispatch() -> Result<Vec<DispatchPendingItem>, String> {
    #[derive(Deserialize)]
    struct PendingResult {
        pending: Vec<DispatchPendingItem>,
    }
    let result: PendingResult = helper_get("/dispatch/pending").await?;
    Ok(result.pending)
}

pub async fn ack_dispatch(
    dispatch_id: &str,
    status: &str,
    failure_reason: Option<&str>,
    response_ciphertext: Option<&str>,
    response_nonce: Option<&str>,
) -> Result<(), String> {
    helper_post::<serde_json::Value>(
        &format!("/dispatch/{dispatch_id}/ack"),
        &serde_json::json!({
            "status": status,
            "failureReason": failure_reason,
            "responseCiphertext": response_ciphertext,
            "responseNonce": response_nonce,
        }),
    )
    .await?;
    Ok(())
}

pub async fn cloud_direct_post<T: for<'de> Deserialize<'de>>(
    server_url: &str,
    token: Option<&str>,
    path: &str,
    body: &serde_json::Value,
) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{}{}", server_url.trim_end_matches('/'), path);
    let mut req = client.post(&url).json(body);
    if let Some(t) = token.filter(|s| !s.is_empty()) {
        req = req.header("Authorization", format!("Bearer {t}"));
    }
    let resp = req.send().await.map_err(|e| format!("Cannot reach Aura Cloud: {e}"))?;
    let status = resp.status();
    if !status.is_success() {
        let err: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: format!("Cloud error {}", status),
        });
        return Err(err.error);
    }
    resp.json().await.map_err(|e| e.to_string())
}

pub async fn cloud_direct_get<T: for<'de> Deserialize<'de>>(
    server_url: &str,
    token: Option<&str>,
    path: &str,
) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{}{}", server_url.trim_end_matches('/'), path);
    let mut req = client.get(&url);
    if let Some(t) = token.filter(|s| !s.is_empty()) {
        req = req.header("Authorization", format!("Bearer {t}"));
    }
    let resp = req.send().await.map_err(|e| format!("Cannot reach Aura Cloud: {e}"))?;
    let status = resp.status();
    if !status.is_success() {
        let err: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: format!("Cloud error {}", status),
        });
        return Err(err.error);
    }
    resp.json().await.map_err(|e| e.to_string())
}

pub async fn check_cloud_server_health(server_url: &str) -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{}/health", server_url.trim_end_matches('/'));
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    Ok(resp.status().is_success())
}
