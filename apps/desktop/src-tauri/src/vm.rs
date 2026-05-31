use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::files::project_folder;
use crate::permissions::check_task_permission;
use crate::shell::{
    always_requires_approval, categorize_command, is_hard_denied, needs_mount_write,
};
use serde::{Deserialize, Serialize};

const VM_HELPER_URL: &str = "http://127.0.0.1:47822";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VmMount {
    pub project_id: String,
    pub host_path: String,
    pub guest_path: String,
    pub mode: String,
    pub mounted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VmStatus {
    pub state: String,
    pub backend: String,
    pub backend_label: String,
    pub image_version: String,
    pub mounts: Vec<VmMount>,
    pub started_at: Option<String>,
    pub last_error: Option<String>,
    pub remediation: Option<String>,
    #[serde(default)]
    pub running: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VmHealth {
    status: String,
    phase: u32,
    version: String,
    backend: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VmExecResult {
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
    duration_ms: u64,
    truncated: bool,
    backend: String,
}

#[derive(Debug, Deserialize)]
struct VmErrorBody {
    error: String,
    remediation: Option<String>,
}

async fn vm_get<T: for<'de> Deserialize<'de>>(path: &str) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(format!("{VM_HELPER_URL}{path}"))
        .send()
        .await
        .map_err(|_| {
            "VM helper is not running. Start it with: npm run vm-helper".to_string()
        })?;
    if !resp.status().is_success() {
        let body: VmErrorBody = resp.json().await.unwrap_or(VmErrorBody {
            error: "VM helper error".into(),
            remediation: Some("Run: npm run vm-helper".into()),
        });
        return Err(format_vm_error(&body.error, body.remediation.as_deref()));
    }
    resp.json().await.map_err(|e| e.to_string())
}

async fn vm_post<T: for<'de> Deserialize<'de>>(
    path: &str,
    body: &serde_json::Value,
) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post(format!("{VM_HELPER_URL}{path}"))
        .json(body)
        .send()
        .await
        .map_err(|_| {
            "VM helper is not running. Start it with: npm run vm-helper".to_string()
        })?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body: VmErrorBody = resp.json().await.unwrap_or(VmErrorBody {
            error: format!("VM helper returned {status}"),
            remediation: Some("Run: npm run vm-helper".into()),
        });
        return Err(format_vm_error(&body.error, body.remediation.as_deref()));
    }
    resp.json().await.map_err(|e| e.to_string())
}

fn format_vm_error(error: &str, remediation: Option<&str>) -> String {
    if error.contains("workspace unavailable") {
        if let Some(r) = remediation {
            return format!("workspace unavailable: {error}. {r}");
        }
        return format!("workspace unavailable: {error}");
    }
    error.to_string()
}

fn enrich_status(mut status: VmStatus) -> VmStatus {
    status.running = status.state == "running";
    status
}

#[tauri::command]
pub async fn get_vm_status() -> Result<VmStatus, String> {
    match vm_get::<VmStatus>("/status").await {
        Ok(s) => Ok(enrich_status(s)),
        Err(_) => Ok(VmStatus {
            state: "unavailable".into(),
            backend: "none".into(),
            backend_label: "VM helper offline".into(),
            image_version: "0.4.0".into(),
            mounts: vec![],
            started_at: None,
            last_error: Some("VM helper is not running".into()),
            remediation: Some("Start VM helper: npm run vm-helper".into()),
            running: false,
        }),
    }
}

#[tauri::command]
pub async fn start_vm() -> Result<VmStatus, String> {
    let status = vm_post::<VmStatus>("/start", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

#[tauri::command]
pub async fn stop_vm() -> Result<VmStatus, String> {
    let status = vm_post::<VmStatus>("/stop", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

pub async fn ensure_vm_ready() -> Result<VmStatus, String> {
    if let Ok(health) = vm_get::<VmHealth>("/health").await {
        if health.status == "ok" {
            if let Ok(status) = vm_get::<VmStatus>("/status").await {
                if status.state == "running" {
                    return Ok(enrich_status(status));
                }
            }
        }
    }
    let status = vm_post::<VmStatus>("/start", &serde_json::json!({})).await?;
    Ok(enrich_status(status))
}

async fn mount_project(project_id: &str, host_path: &str, write: bool) -> Result<(), String> {
    vm_post::<VmMount>(
        "/mount",
        &serde_json::json!({
            "projectId": project_id,
            "hostPath": host_path,
            "mode": if write { "read-write" } else { "read" },
        }),
    )
    .await?;
    Ok(())
}

async fn exec_in_vm(project_id: &str, command: &str) -> Result<VmExecResult, String> {
    vm_post::<VmExecResult>(
        "/exec",
        &serde_json::json!({
            "projectId": project_id,
            "command": command,
            "timeoutMs": 120000,
        }),
    )
    .await
}

/// Shell tool entry used by the task engine.
pub async fn tool_run_shell(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    command: &str,
    tool_payload: Option<serde_json::Value>,
) -> Result<String, String> {
    if is_hard_denied(command) {
        return Err("Command denied: destructive pattern blocked by policy.".into());
    }

    let (category, risk) = categorize_command(command);
    let root = project_folder(db, project_id)?;

    let payload = tool_payload;

    check_task_permission(
        db,
        project_id,
        task_id,
        "shell",
        category.as_action(),
        &command.chars().take(200).collect::<String>(),
        &format!(
            "Run shell command in workspace: {}",
            command.chars().take(120).collect::<String>()
        ),
        risk,
        always_requires_approval(category),
        payload,
    )?;

    let vm_status = ensure_vm_ready().await.map_err(|e| {
        if e.contains("not running") || e.contains("unavailable") {
            format!("workspace unavailable: {e}")
        } else {
            e
        }
    })?;

    if vm_status.state == "unavailable" {
        return Err(format!(
            "workspace unavailable: {}. {}",
            vm_status.last_error.unwrap_or_default(),
            vm_status.remediation.unwrap_or_default()
        ));
    }

    let write_mount = needs_mount_write(category, command);
    mount_project(project_id, &root, write_mount).await?;

    let result = exec_in_vm(project_id, command).await?;

    let summary = format!(
        "exit={} backend={} duration={}ms",
        result
            .exit_code
            .map(|c| c.to_string())
            .unwrap_or_else(|| "timeout".into()),
        result.backend,
        result.duration_ms
    );

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id.to_string()),
            task_id: task_id.map(String::from),
            actor: "coordinator".into(),
            category: "shell".into(),
            action: category.as_action().into(),
            target: Some(command.chars().take(200).collect()),
            summary: format!("Shell command ({summary})"),
            risk: Some(risk.into()),
            decision: None,
            result: if result.exit_code.unwrap_or(1) == 0 {
                "succeeded".into()
            } else {
                "failed".into()
            },
            metadata: Some(serde_json::json!({
                "exitCode": result.exit_code,
                "truncated": result.truncated,
                "backend": result.backend,
            })),
        },
    )?;

    let mut output = String::new();
    if !result.stdout.is_empty() {
        output.push_str(&result.stdout);
    }
    if !result.stderr.is_empty() {
        if !output.is_empty() {
            output.push_str("\n--- stderr ---\n");
        }
        output.push_str(&result.stderr);
    }
    if output.is_empty() {
        output = format!("Command finished with exit code {:?}", result.exit_code);
    }
    Ok(output.chars().take(8000).collect())
}
