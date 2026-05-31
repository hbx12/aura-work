use serde::{Deserialize, Serialize};

pub const BRIDGE_HELPER_URL: &str = "http://127.0.0.1:47826";
pub const BRIDGE_INTERNAL_URL: &str = "http://127.0.0.1:47827";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeClientConfig {
    pub id: String,
    pub name: String,
    pub client_type: String,
    pub session_token: String,
    pub project_id: Option<String>,
    pub paired_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeHelperConfigPayload {
    pub internal_secret: String,
    pub clients: Vec<BridgeClientConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeHelperStatus {
    pub state: String,
    pub client_count: u32,
    pub connected_clients: u32,
    pub started_at: Option<String>,
    pub last_error: Option<String>,
    pub remediation: Option<String>,
    pub running: bool,
}

#[derive(Debug, Deserialize)]
struct HelperErrorBody {
    error: String,
    remediation: Option<String>,
}

async fn helper_get<T: for<'de> Deserialize<'de>>(path: &str) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(format!("{BRIDGE_HELPER_URL}{path}"))
        .send()
        .await
        .map_err(|_| {
            "Bridge helper is not running. Start it with: npm run bridge".to_string()
        })?;
    if !resp.status().is_success() {
        let body: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: "Bridge helper error".into(),
            remediation: Some("Run: npm run bridge".into()),
        });
        return Err(format_helper_error(&body.error, body.remediation.as_deref()));
    }
    resp.json().await.map_err(|e| e.to_string())
}

async fn helper_post<T: for<'de> Deserialize<'de>>(
    path: &str,
    body: &serde_json::Value,
) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post(format!("{BRIDGE_HELPER_URL}{path}"))
        .json(body)
        .send()
        .await
        .map_err(|_| {
            "Bridge helper is not running. Start it with: npm run bridge".to_string()
        })?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: format!("Bridge helper returned {status}"),
            remediation: Some("Run: npm run bridge".into()),
        });
        return Err(format_helper_error(&body.error, body.remediation.as_deref()));
    }
    resp.json().await.map_err(|e| e.to_string())
}

fn format_helper_error(error: &str, remediation: Option<&str>) -> String {
    if let Some(r) = remediation {
        return format!("{error}. {r}");
    }
    error.to_string()
}

pub async fn get_bridge_helper_status() -> Result<BridgeHelperStatus, String> {
    match helper_get::<BridgeHelperStatus>("/status").await {
        Ok(mut s) => {
            s.running = s.state == "running";
            Ok(s)
        }
        Err(_) => Ok(BridgeHelperStatus {
            state: "unavailable".into(),
            client_count: 0,
            connected_clients: 0,
            started_at: None,
            last_error: Some("Bridge helper is not running".into()),
            remediation: Some("Start bridge helper: npm run bridge".into()),
            running: false,
        }),
    }
}

pub async fn start_bridge_helper() -> Result<BridgeHelperStatus, String> {
    let status = helper_post::<BridgeHelperStatus>("/start", &serde_json::json!({})).await?;
    Ok(BridgeHelperStatus {
        running: status.state == "running",
        ..status
    })
}

pub async fn stop_bridge_helper() -> Result<BridgeHelperStatus, String> {
    let status = helper_post::<BridgeHelperStatus>("/stop", &serde_json::json!({})).await?;
    Ok(BridgeHelperStatus {
        running: status.state == "running",
        ..status
    })
}

pub async fn sync_bridge_helper_config(
    payload: &BridgeHelperConfigPayload,
) -> Result<BridgeHelperStatus, String> {
    let status = helper_post::<BridgeHelperStatus>(
        "/config",
        &serde_json::to_value(payload).map_err(|e| e.to_string())?,
    )
    .await?;
    Ok(BridgeHelperStatus {
        running: status.state == "running",
        ..status
    })
}

pub async fn ensure_bridge_helper_ready() -> Result<BridgeHelperStatus, String> {
    if let Ok(status) = get_bridge_helper_status().await {
        if status.running {
            return Ok(status);
        }
    }
    start_bridge_helper().await
}
