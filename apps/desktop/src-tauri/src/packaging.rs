use crate::db::DbState;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

const PENDING_OPEN_TASK_KEY: &str = "pending_open_task_id";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleManifestSidecar {
    pub id: String,
    pub port: u16,
    pub resource_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleManifest {
    pub schema_version: String,
    pub version: String,
    pub product_name: String,
    pub node_runtime: serde_json::Value,
    pub vm_image: serde_json::Value,
    pub sidecars: Vec<BundleManifestSidecar>,
    pub updates: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VmImageManifest {
    pub schema_version: String,
    pub image_id: String,
    pub version: String,
    pub sha256: String,
    pub signature: String,
    pub artifact: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VmImageVerification {
    pub ok: bool,
    pub image_id: String,
    pub version: String,
    pub expected_sha256: String,
    pub actual_sha256: Option<String>,
    pub signature_present: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackagingInfo {
    pub app_version: String,
    pub bundle_version: String,
    pub node_runtime_bundled: bool,
    pub node_min_version: String,
    pub vm_image: VmImageVerification,
    pub sidecar_count: u32,
    pub manifest_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub message: String,
    pub verification: String,
}

fn resource_roots(app: &AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(dir) = app.path().resource_dir() {
        roots.push(dir);
    }
    if let Ok(dir) = app.path().app_data_dir() {
        roots.push(dir);
    }
    if let Ok(cwd) = std::env::current_dir() {
        roots.push(cwd.join("bundle"));
        roots.push(cwd.join("..").join("..").join("bundle"));
    }
    roots
}

fn find_file(app: &AppHandle, relative: &str) -> Option<PathBuf> {
    for root in resource_roots(app) {
        let candidate = root.join(relative);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

const DEV_PLACEHOLDER_SIGNATURE: &str = "dev-placeholder-signature-replace-in-release-pipeline";

fn is_dev_placeholder_manifest(manifest: &VmImageManifest) -> bool {
    manifest.artifact.contains("placeholder")
        || manifest.signature.contains("dev-placeholder")
        || manifest.sha256.is_empty()
        || manifest.sha256 == "pending-build"
}

fn is_release_build() -> bool {
    !cfg!(debug_assertions)
}

fn verify_minisign_signature(artifact_path: &Path, signature: &str) -> Result<(), String> {
    if signature.is_empty() || signature.contains("dev-placeholder") {
        return Err("Missing or placeholder release signature.".into());
    }
    let sig_path = artifact_path.with_extension("minisig");
    if sig_path.exists() {
        let output = std::process::Command::new("minisign")
            .args(["-V", "-p", "-x"])
            .arg(&sig_path)
            .arg("-m")
            .arg(artifact_path)
            .output()
            .map_err(|e| format!("minisign not available for signature verification: {e}"))?;
        if output.status.success() {
            return Ok(());
        }
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("VM image signature verification failed: {stderr}"));
    }
    if signature.len() < 64 {
        return Err("Signature field is not a valid minisign release signature.".into());
    }
    Err("Detached minisign signature file not found next to VM artifact.".into())
}

pub fn verify_vm_manifest_at(manifest_path: &Path) -> VmImageVerification {
    let raw = match fs::read_to_string(manifest_path) {
        Ok(r) => r,
        Err(e) => {
            return VmImageVerification {
                ok: false,
                image_id: "unknown".into(),
                version: "0.0.0".into(),
                expected_sha256: String::new(),
                actual_sha256: None,
                signature_present: false,
                message: format!("Cannot read VM manifest: {e}"),
            };
        }
    };
    let manifest: VmImageManifest = match serde_json::from_str(&raw) {
        Ok(m) => m,
        Err(e) => {
            return VmImageVerification {
                ok: false,
                image_id: "unknown".into(),
                version: "0.0.0".into(),
                expected_sha256: String::new(),
                actual_sha256: None,
                signature_present: false,
                message: format!("Invalid VM manifest JSON: {e}"),
            };
        }
    };
    let signature_present = !manifest.signature.is_empty()
        && manifest.signature != DEV_PLACEHOLDER_SIGNATURE;
    let dev_placeholder = is_dev_placeholder_manifest(&manifest);
    let artifact_dir = manifest_path.parent().unwrap_or_else(|| Path::new("."));
    let artifact_path = artifact_dir.join(&manifest.artifact);
    let actual = if artifact_path.exists() {
        sha256_file(&artifact_path).ok()
    } else {
        None
    };
    let hash_ok = actual
        .as_ref()
        .map(|a| a.eq_ignore_ascii_case(&manifest.sha256))
        .unwrap_or(false);
    let missing_artifact = actual.is_none();
    let signature_ok = if is_release_build() {
        if dev_placeholder {
            false
        } else if signature_present {
            verify_minisign_signature(&artifact_path, &manifest.signature).is_ok()
        } else {
            false
        }
    } else {
        signature_present || dev_placeholder
    };
    let ok = hash_ok && !manifest.sha256.is_empty() && signature_ok && !(is_release_build() && dev_placeholder);
    VmImageVerification {
        ok,
        image_id: manifest.image_id,
        version: manifest.version,
        expected_sha256: manifest.sha256,
        actual_sha256: actual,
        signature_present,
        message: if is_release_build() && dev_placeholder {
            "Production builds reject unsigned VM placeholder artifacts.".into()
        } else if ok {
            if signature_present && verify_minisign_signature(&artifact_path, &manifest.signature).is_ok() {
                "VM image hash and release signature verified.".into()
            } else if !is_release_build() && dev_placeholder {
                "VM image hash verified (development placeholder only).".into()
            } else {
                "VM image hash verified.".into()
            }
        } else if missing_artifact {
            format!(
                "VM artifact '{}' not found next to manifest.",
                manifest.artifact
            )
        } else if is_release_build() && !signature_present {
            "Release VM image requires a valid minisign signature.".into()
        } else {
            "VM image SHA-256 mismatch or signature verification failed — refuse to use tampered image.".into()
        },
    }
}

pub fn verify_vm_image_at(app: &AppHandle, manifest_path: &Path) -> VmImageVerification {
    let _ = app;
    verify_vm_manifest_at(manifest_path)
}

pub fn load_packaging_info(app: &AppHandle) -> Result<PackagingInfo, String> {
    let manifest_path = find_file(app, "manifest.json");

    let bundle: Option<BundleManifest> = manifest_path
        .as_ref()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok());

    let vm_manifest_path = find_file(app, "vm-image/manifest.json")
        .or_else(|| find_file(app, "resources/vm-image/manifest.json"));
    let vm_image = vm_manifest_path
        .as_ref()
        .map(|p| verify_vm_image_at(app, p))
        .unwrap_or(VmImageVerification {
            ok: false,
            image_id: "aura-linux-workspace".into(),
            version: "1.0.0".into(),
            expected_sha256: String::new(),
            actual_sha256: None,
            signature_present: false,
            message: "VM manifest not found in bundle resources.".into(),
        });

    let node_runtime_bundled = bundle
        .as_ref()
        .and_then(|b| b.node_runtime.get("bundled"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let node_min_version = bundle
        .as_ref()
        .and_then(|b| b.node_runtime.get("minVersion"))
        .and_then(|v| v.as_str())
        .unwrap_or("20.0.0")
        .to_string();

    Ok(PackagingInfo {
        app_version: env!("CARGO_PKG_VERSION").into(),
        bundle_version: bundle
            .as_ref()
            .map(|b| b.version.clone())
            .unwrap_or_else(|| "1.0.0".into()),
        node_runtime_bundled,
        node_min_version,
        sidecar_count: bundle.as_ref().map(|b| b.sidecars.len() as u32).unwrap_or(7),
        manifest_path: manifest_path.map(|p| p.to_string_lossy().to_string()),
        vm_image,
    })
}

#[tauri::command]
pub fn get_packaging_info(app: AppHandle) -> Result<PackagingInfo, String> {
    load_packaging_info(&app)
}

#[tauri::command]
pub fn verify_vm_image(app: AppHandle) -> Result<VmImageVerification, String> {
    let path = find_file(&app, "vm-image/manifest.json")
        .ok_or_else(|| "VM manifest not bundled.".to_string())?;
    Ok(verify_vm_image_at(&app, &path))
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateCheckResult, String> {
    let current = app.package_info().version.to_string();
    #[cfg(desktop)]
    {
        use tauri_plugin_updater::UpdaterExt;
        match app.updater_builder().build() {
            Ok(updater) => match updater.check().await {
                Ok(Some(update)) => Ok(UpdateCheckResult {
                    available: true,
                    current_version: current.clone(),
                    latest_version: Some(update.version.clone()),
                    message: format!("Signed update {} available.", update.version),
                    verification: "minisign".into(),
                }),
                Ok(None) => Ok(UpdateCheckResult {
                    available: false,
                    current_version: current,
                    latest_version: None,
                    message: "You are on the latest signed release.".into(),
                    verification: "minisign".into(),
                }),
                Err(e) => Ok(UpdateCheckResult {
                    available: false,
                    current_version: current,
                    latest_version: None,
                    message: format!("Update check skipped (dev/offline): {e}"),
                    verification: "minisign".into(),
                }),
            },
            Err(e) => Ok(UpdateCheckResult {
                available: false,
                current_version: current,
                latest_version: None,
                message: format!("Updater not configured: {e}"),
                verification: "minisign".into(),
            }),
        }
    }
    #[cfg(not(desktop))]
    {
        Ok(UpdateCheckResult {
            available: false,
            current_version: current,
            latest_version: None,
            message: "Updates not supported on this platform.".into(),
            verification: "none".into(),
        })
    }
}

pub fn set_pending_open_task(db: &DbState, task_id: &str) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![PENDING_OPEN_TASK_KEY, task_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_pending_open_task(db: State<'_, DbState>) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let value: Option<String> = conn
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            rusqlite::params![PENDING_OPEN_TASK_KEY],
            |row| row.get(0),
        )
        .ok();
    Ok(value.filter(|v| !v.is_empty()))
}

#[tauri::command]
pub fn clear_pending_open_task(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM app_settings WHERE key = ?1",
        rusqlite::params![PENDING_OPEN_TASK_KEY],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn list_task_logs(db: &DbState, task_id: &str, limit: u32) -> Result<Vec<crate::audit::AuditEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let lim = limit.min(500);
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, task_id, actor, category, action, target, summary, risk, decision, result, created_at, metadata
             FROM audit_log WHERE task_id = ?1 ORDER BY created_at ASC LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![task_id, lim], |row| {
            Ok(crate::audit::AuditEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                task_id: row.get(2)?,
                actor: row.get(3)?,
                category: row.get(4)?,
                action: row.get(5)?,
                target: row.get(6)?,
                summary: row.get(7)?,
                risk: row.get(8)?,
                decision: row.get(9)?,
                result: row.get(10)?,
                created_at: row.get(11)?,
                metadata: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn write_manifest(dir: &Path, artifact: &str, sha256: &str, signature: &str) -> PathBuf {
        let manifest_path = dir.join("manifest.json");
        let body = format!(
            r#"{{
  "schemaVersion": "1",
  "imageId": "test-image",
  "version": "0.1.0",
  "sha256": "{sha256}",
  "signature": "{signature}",
  "artifact": "{artifact}"
}}"#
        );
        fs::write(&manifest_path, body).unwrap();
        manifest_path
    }

    fn temp_case_dir(name: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("aura-packaging-{name}-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn rejects_dev_placeholder_in_release_builds() {
        let dir = temp_case_dir("placeholder");
        let artifact = "aura-linux-workspace.img.placeholder";
        fs::write(dir.join(artifact), b"placeholder").unwrap();
        let hash = sha256_file(&dir.join(artifact)).unwrap();
        let manifest = write_manifest(
            &dir,
            artifact,
            &hash,
            DEV_PLACEHOLDER_SIGNATURE,
        );
        let result = verify_vm_manifest_at(&manifest);
        if is_release_build() {
            assert!(!result.ok);
            assert!(result.message.contains("placeholder"));
        }
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rejects_tampered_hash() {
        let dir = temp_case_dir("tampered");
        let artifact = "image.bin";
        fs::write(dir.join(artifact), b"good").unwrap();
        let manifest = write_manifest(&dir, artifact, "deadbeef", DEV_PLACEHOLDER_SIGNATURE);
        let result = verify_vm_manifest_at(&manifest);
        assert!(!result.ok);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rejects_missing_manifest_artifact() {
        let dir = temp_case_dir("missing");
        let manifest = write_manifest(&dir, "missing.bin", "abc", DEV_PLACEHOLDER_SIGNATURE);
        let result = verify_vm_manifest_at(&manifest);
        assert!(!result.ok);
        assert!(result.message.contains("not found"));
        let _ = fs::remove_dir_all(dir);
    }
}
