use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::permissions::check_task_permission;
use crate::web::{always_requires_approval, risk_label, scan_prompt_injection, validate_url};
use serde::{Deserialize, Serialize};

const BROWSER_HELPER_URL: &str = "http://127.0.0.1:47823";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserProfile {
    pub project_id: String,
    pub profile_path: String,
    pub created_at: String,
    pub last_used_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserStatus {
    pub state: String,
    pub backend: String,
    pub backend_label: String,
    pub profiles: Vec<BrowserProfile>,
    pub started_at: Option<String>,
    pub last_error: Option<String>,
    pub remediation: Option<String>,
    pub running: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BrowserHealth {
    status: String,
    phase: u32,
    version: String,
    backend: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebSource {
    url: String,
    title: String,
    fetched_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BrowseResult {
    source: WebSource,
    text: String,
    backend: String,
    duration_ms: u64,
    truncated: bool,
    injection_warnings: Vec<String>,
    citation: String,
}

#[derive(Debug, Deserialize)]
struct BrowserErrorBody {
    error: String,
    remediation: Option<String>,
}

async fn browser_get<T: for<'de> Deserialize<'de>>(path: &str) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(format!("{BROWSER_HELPER_URL}{path}"))
        .send()
        .await
        .map_err(|_| {
            "Browser helper is not running. Start it with: npm run browser-helper".to_string()
        })?;
    if !resp.status().is_success() {
        let body: BrowserErrorBody = resp.json().await.unwrap_or(BrowserErrorBody {
            error: "Browser helper error".into(),
            remediation: Some("Run: npm run browser-helper".into()),
        });
        return Err(format_browser_error(&body.error, body.remediation.as_deref()));
    }
    resp.json().await.map_err(|e| e.to_string())
}

async fn browser_post<T: for<'de> Deserialize<'de>>(
    path: &str,
    body: &serde_json::Value,
) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post(format!("{BROWSER_HELPER_URL}{path}"))
        .json(body)
        .send()
        .await
        .map_err(|_| {
            "Browser helper is not running. Start it with: npm run browser-helper".to_string()
        })?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body: BrowserErrorBody = resp.json().await.unwrap_or(BrowserErrorBody {
            error: format!("Browser helper returned {status}"),
            remediation: Some("Run: npm run browser-helper".into()),
        });
        return Err(format_browser_error(&body.error, body.remediation.as_deref()));
    }
    resp.json().await.map_err(|e| e.to_string())
}

fn format_browser_error(error: &str, remediation: Option<&str>) -> String {
    if error.contains("browser unavailable") {
        if let Some(r) = remediation {
            return format!("browser unavailable: {error}. {r}");
        }
        return format!("browser unavailable: {error}");
    }
    error.to_string()
}

fn enrich_status(mut status: BrowserStatus) -> BrowserStatus {
    status.running = status.state == "running";
    status
}

#[tauri::command]
pub async fn get_browser_status() -> Result<BrowserStatus, String> {
    match browser_get::<BrowserStatus>("/status").await {
        Ok(s) => Ok(enrich_status(s)),
        Err(_) => Ok(BrowserStatus {
            state: "unavailable".into(),
            backend: "none".into(),
            backend_label: "Browser helper offline".into(),
            profiles: vec![],
            started_at: None,
            last_error: Some("Browser helper is not running".into()),
            remediation: Some("Start browser helper: npm run browser-helper".into()),
            running: false,
        }),
    }
}

#[tauri::command]
pub async fn start_browser() -> Result<BrowserStatus, String> {
    let status = browser_post::<BrowserStatus>("/start", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

#[tauri::command]
pub async fn stop_browser() -> Result<BrowserStatus, String> {
    let status = browser_post::<BrowserStatus>("/stop", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

pub async fn ensure_browser_ready() -> Result<BrowserStatus, String> {
    if let Ok(health) = browser_get::<BrowserHealth>("/health").await {
        if health.status == "ok" || health.status == "idle" {
            if let Ok(status) = browser_get::<BrowserStatus>("/status").await {
                if status.state == "running" {
                    return Ok(enrich_status(status));
                }
            }
        }
    }
    let status = browser_post::<BrowserStatus>("/start", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

/// Browse tool entry used by the task engine.
pub async fn tool_browse_url(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    url: &str,
    extract: Option<&str>,
    tool_payload: Option<serde_json::Value>,
) -> Result<String, String> {
    let (normalized_url, risk) = validate_url(url)?;

    let payload = tool_payload;

    check_task_permission(
        db,
        project_id,
        task_id,
        "browser",
        "browse",
        &normalized_url.chars().take(200).collect::<String>(),
        &format!(
            "Browse web page: {}",
            normalized_url.chars().take(120).collect::<String>()
        ),
        risk_label(risk),
        always_requires_approval(risk),
        payload,
    )?;

    let browser_status = ensure_browser_ready().await.map_err(|e| {
        if e.contains("not running") || e.contains("unavailable") {
            format!("browser unavailable: {e}")
        } else {
            e
        }
    })?;

    if browser_status.state == "unavailable" {
        return Err(format!(
            "browser unavailable: {}. {}",
            browser_status.last_error.unwrap_or_default(),
            browser_status.remediation.unwrap_or_default()
        ));
    }

    browser_post::<serde_json::Value>(
        "/profile",
        &serde_json::json!({ "projectId": project_id }),
    )
    .await?;

    let result = browser_post::<BrowseResult>(
        "/browse",
        &serde_json::json!({
            "projectId": project_id,
            "url": normalized_url,
            "extract": extract.unwrap_or("text"),
            "timeoutMs": 45000,
        }),
    )
    .await?;

    let mut warnings = result.injection_warnings.clone();
    warnings.extend(scan_prompt_injection(&result.text));
    warnings.sort();
    warnings.dedup();

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id.to_string()),
            task_id: task_id.map(String::from),
            actor: "coordinator".into(),
            category: "browser".into(),
            action: "browse".into(),
            target: Some(normalized_url.clone()),
            summary: format!(
                "Browse {} — {} (backend={})",
                result.source.title, result.citation, result.backend
            ),
            risk: Some(risk_label(risk).into()),
            decision: None,
            result: "succeeded".into(),
            metadata: Some(serde_json::json!({
                "backend": result.backend,
                "truncated": result.truncated,
                "injectionWarnings": warnings,
                "citation": result.citation,
            })),
        },
    )?;

    let mut output = format!(
        "{}\nTitle: {}\nURL: {}\nBackend: {}\n\n{}",
        result.citation, result.source.title, result.source.url, result.backend, result.text
    );
    if !warnings.is_empty() {
        output.push_str("\n\n[Prompt injection warnings: ");
        output.push_str(&warnings.join(", "));
        output.push_str("]");
    }
    if result.truncated {
        output.push_str("\n[Content truncated]");
    }
    output.push_str("\n\nWhen summarizing this page for the user, you MUST include the citation above.");
    Ok(output.chars().take(10000).collect())
}
