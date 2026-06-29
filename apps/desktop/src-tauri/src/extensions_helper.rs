use crate::sidecar_auth::authorized_reqwest;
use serde::{Deserialize, Serialize};

pub const PLUGINS_HELPER_URL: &str = "http://127.0.0.1:47824";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginsHelperStatus {
    pub state: String,
    pub plugin_count: u32,
    pub mcp_server_count: u32,
    pub mcp_connected_count: u32,
    pub tool_count: u32,
    pub started_at: Option<String>,
    pub last_error: Option<String>,
    pub remediation: Option<String>,
    pub running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub schema_version: String,
    pub id: String,
    pub name: String,
    pub version: String,
    pub publisher: Option<String>,
    pub description: Option<String>,
    pub homepage: Option<String>,
    pub license: Option<String>,
    #[serde(default)]
    pub tools: Vec<PluginToolDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginToolDef {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPluginConfig {
    pub id: String,
    pub install_path: String,
    pub enabled: bool,
    pub manifest: PluginManifest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub transport: String,
    pub command: String,
    pub args: Vec<String>,
    #[serde(default)]
    pub env: serde_json::Map<String, serde_json::Value>,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<std::collections::HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMcpSetting {
    pub project_id: String,
    pub server_id: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperConfigPayload {
    pub plugins: Vec<InstalledPluginConfig>,
    pub mcp_servers: Vec<McpServerConfig>,
    pub project_mcp_settings: Vec<ProjectMcpSetting>,
}

#[derive(Debug, Deserialize)]
struct HelperErrorBody {
    error: String,
    remediation: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallResult {
    pub ok: bool,
    pub output: String,
    pub duration_ms: u64,
    pub source: String,
}

async fn helper_get<T: for<'de> Deserialize<'de>>(path: &str) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = authorized_reqwest(
        client.get(format!("{PLUGINS_HELPER_URL}{path}")),
        "aura-plugins-helper",
    )
        .send()
        .await
        .map_err(|_| {
            "Plugins helper is not running. Start it with: npm run plugins-helper".to_string()
        })?;
    if !resp.status().is_success() {
        let body: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: "Plugins helper error".into(),
            remediation: Some("Run: npm run plugins-helper".into()),
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
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = authorized_reqwest(
        client.post(format!("{PLUGINS_HELPER_URL}{path}")),
        "aura-plugins-helper",
    )
        .json(body)
        .send()
        .await
        .map_err(|_| {
            "Plugins helper is not running. Start it with: npm run plugins-helper".to_string()
        })?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body: HelperErrorBody = resp.json().await.unwrap_or(HelperErrorBody {
            error: format!("Plugins helper returned {status}"),
            remediation: Some("Run: npm run plugins-helper".into()),
        });
        return Err(format_helper_error(&body.error, body.remediation.as_deref()));
    }
    resp.json().await.map_err(|e| e.to_string())
}

fn format_helper_error(error: &str, remediation: Option<&str>) -> String {
    if error.contains("plugins unavailable") {
        if let Some(r) = remediation {
            return format!("plugins unavailable: {error}. {r}");
        }
        return format!("plugins unavailable: {error}");
    }
    error.to_string()
}

pub async fn get_plugins_helper_status() -> Result<PluginsHelperStatus, String> {
    match helper_get::<PluginsHelperStatus>("/status").await {
        Ok(mut s) => {
            s.running = s.state == "running";
            Ok(s)
        }
        Err(_) => Ok(PluginsHelperStatus {
            state: "unavailable".into(),
            plugin_count: 0,
            mcp_server_count: 0,
            mcp_connected_count: 0,
            tool_count: 0,
            started_at: None,
            last_error: Some("Plugins helper is not running".into()),
            remediation: Some("Start plugins helper: npm run plugins-helper".into()),
            running: false,
        }),
    }
}

pub async fn start_plugins_helper() -> Result<PluginsHelperStatus, String> {
    let status = helper_post::<PluginsHelperStatus>("/start", &serde_json::json!({})).await?;
    Ok(PluginsHelperStatus {
        running: status.state == "running",
        ..status
    })
}

pub async fn stop_plugins_helper() -> Result<PluginsHelperStatus, String> {
    let status = helper_post::<PluginsHelperStatus>("/stop", &serde_json::json!({})).await?;
    Ok(PluginsHelperStatus {
        running: status.state == "running",
        ..status
    })
}

pub async fn sync_helper_config(payload: &HelperConfigPayload) -> Result<PluginsHelperStatus, String> {
    let status = helper_post::<PluginsHelperStatus>(
        "/config",
        &serde_json::to_value(payload).map_err(|e| e.to_string())?,
    )
    .await?;
    Ok(PluginsHelperStatus {
        running: status.state == "running",
        ..status
    })
}

pub async fn ensure_plugins_helper_ready() -> Result<PluginsHelperStatus, String> {
    if let Ok(status) = get_plugins_helper_status().await {
        if status.running {
            return Ok(status);
        }
    }
    start_plugins_helper().await
}

pub async fn call_plugin_tool_remote(
    project_id: &str,
    plugin_id: &str,
    tool_id: &str,
    arguments: &serde_json::Value,
) -> Result<CallResult, String> {
    helper_post(
        "/plugin/call",
        &serde_json::json!({
            "projectId": project_id,
            "pluginId": plugin_id,
            "toolId": tool_id,
            "arguments": arguments,
        }),
    )
    .await
}

pub async fn call_mcp_tool_remote(
    project_id: &str,
    server_id: &str,
    tool_name: &str,
    arguments: &serde_json::Value,
) -> Result<CallResult, String> {
    helper_post(
        "/mcp/call",
        &serde_json::json!({
            "projectId": project_id,
            "serverId": server_id,
            "toolName": tool_name,
            "arguments": arguments,
        }),
    )
    .await
}

pub async fn fetch_marketplace_remote(registry_url: Option<&str>) -> Result<serde_json::Value, String> {
    helper_post(
        "/marketplace/fetch",
        &serde_json::json!({ "registryUrl": registry_url }),
    )
    .await
}

pub async fn get_all_tools_remote(project_id: Option<&str>) -> Result<serde_json::Value, String> {
    let path = if let Some(pid) = project_id {
        format!("/tools?projectId={pid}")
    } else {
        "/tools".to_string()
    };
    helper_get(&path).await
}
