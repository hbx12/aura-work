use crate::db::DbState;
use minisign_verify::{PublicKey, Signature};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
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

fn pinned_vm_public_key() -> Option<&'static str> {
    option_env!("AURA_VM_MINISIGN_PUBLIC_KEY")
        .map(str::trim)
        .filter(|key| {
            !key.is_empty()
                && !key.contains("REPLACE_WITH")
                && !key.contains("dev-placeholder")
                && key.len() >= 40
        })
}

fn expected_signature_filename(artifact: &str) -> String {
    format!("{artifact}.minisig")
}

fn parse_minisign_public_key(public_key: &str) -> Result<PublicKey, String> {
    if public_key.lines().count() > 1 {
        PublicKey::decode(public_key).map_err(|e| format!("Invalid pinned VM public key: {e}"))
    } else {
        PublicKey::from_base64(public_key)
            .map_err(|e| format!("Invalid pinned VM public key: {e}"))
    }
}

fn verify_minisign_signature_with_key(
    artifact_path: &Path,
    signature_path: &Path,
    public_key: &str,
) -> Result<(), String> {
    let public_key = parse_minisign_public_key(public_key)?;
    let signature = Signature::from_file(signature_path)
        .map_err(|e| format!("Invalid VM minisign signature: {e}"))?;

    match public_key.verify_stream(&signature) {
        Ok(mut verifier) => {
            let mut file = fs::File::open(artifact_path)
                .map_err(|e| format!("Cannot read VM artifact for signature verification: {e}"))?;
            let mut buffer = [0u8; 8192];
            loop {
                let read = file
                    .read(&mut buffer)
                    .map_err(|e| format!("Cannot read VM artifact for signature verification: {e}"))?;
                if read == 0 {
                    break;
                }
                verifier.update(&buffer[..read]);
            }
            verifier
                .finalize()
                .map_err(|e| format!("VM image signature verification failed: {e}"))
        }
        Err(minisign_verify::Error::UnsupportedLegacyMode) => {
            let bytes = fs::read(artifact_path)
                .map_err(|e| format!("Cannot read VM artifact for signature verification: {e}"))?;
            public_key
                .verify(&bytes, &signature, true)
                .map_err(|e| format!("VM image signature verification failed: {e}"))
        }
        Err(e) => Err(format!("VM image signature verification failed: {e}")),
    }
}

pub fn verify_vm_manifest_at(manifest_path: &Path) -> VmImageVerification {
    verify_vm_manifest_at_with_policy(manifest_path, is_release_build(), pinned_vm_public_key())
}

fn verify_vm_manifest_at_with_policy(
    manifest_path: &Path,
    release_build: bool,
    public_key: Option<&str>,
) -> VmImageVerification {
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
    let dev_placeholder = is_dev_placeholder_manifest(&manifest);
    let artifact_dir = manifest_path.parent().unwrap_or_else(|| Path::new("."));
    let artifact_path = artifact_dir.join(&manifest.artifact);
    let expected_signature = expected_signature_filename(&manifest.artifact);
    let signature_name_ok = manifest.signature == expected_signature;
    let signature_path = artifact_dir.join(&manifest.signature);
    let signature_present = !manifest.signature.is_empty()
        && manifest.signature != DEV_PLACEHOLDER_SIGNATURE
        && signature_path.exists();
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
    let signature_check = if release_build {
        if dev_placeholder {
            Err("Production builds reject unsigned VM placeholder artifacts.".to_string())
        } else if public_key.is_none() {
            Err("Pinned VM minisign public key is missing from this build.".to_string())
        } else if !signature_name_ok {
            Err(format!(
                "VM signature filename must be '{}'.",
                expected_signature
            ))
        } else if !signature_present {
            Err(format!(
                "Detached minisign signature '{}' not found next to VM artifact.",
                manifest.signature
            ))
        } else {
            verify_minisign_signature_with_key(
                &artifact_path,
                &signature_path,
                public_key.expect("checked above"),
            )
        }
    } else {
        Ok(())
    };
    let signature_ok = signature_check.is_ok();
    let ok = hash_ok
        && !manifest.sha256.is_empty()
        && signature_ok
        && !(release_build && dev_placeholder);
    VmImageVerification {
        ok,
        image_id: manifest.image_id,
        version: manifest.version,
        expected_sha256: manifest.sha256,
        actual_sha256: actual,
        signature_present,
        message: if release_build && dev_placeholder {
            "Production builds reject unsigned VM placeholder artifacts.".into()
        } else if ok {
            if release_build {
                "VM image hash and release signature verified.".into()
            } else if dev_placeholder {
                "VM image hash verified (development placeholder only).".into()
            } else {
                "VM image hash verified.".into()
            }
        } else if missing_artifact {
            format!(
                "VM artifact '{}' not found next to manifest.",
                manifest.artifact
            )
        } else if !hash_ok {
            "VM image SHA-256 mismatch — refuse to use tampered image.".into()
        } else if let Err(error) = signature_check {
            error
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

    const TEST_PUBLIC_KEY: &str = "RWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3";
    const TEST_SIGNATURE: &str = "untrusted comment: signature from minisign secret key
RWQf6LRCGA9i59SLOFxz6NxvASXDJeRtuZykwQepbDEGt87ig1BNpWaVWuNrm73YiIiJbq71Wi+dP9eKL8OC351vwIasSSbXxwA=
trusted comment: timestamp:1555779966\tfile:test
QtKMXWyYcwdpZAlPF7tE2ENJkRd1ujvKjlj1m9RtHTBnZPa5WKU5uWRs5GoP5M/VqE81QFuMKI5k/SfNQUaOAA==
";

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
        let result = verify_vm_manifest_at_with_policy(&manifest, true, Some(TEST_PUBLIC_KEY));
        assert!(!result.ok);
        assert!(result.message.contains("placeholder"));
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

    #[test]
    fn rejects_missing_manifest_file() {
        let dir = temp_case_dir("missing-manifest");
        let result = verify_vm_manifest_at(&dir.join("manifest.json"));

        assert!(!result.ok);
        assert!(result.message.contains("Cannot read VM manifest"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn verifies_signed_release_artifact() {
        let dir = temp_case_dir("signed");
        let artifact = "image.bin";
        fs::write(dir.join(artifact), b"test").unwrap();
        fs::write(dir.join(expected_signature_filename(artifact)), TEST_SIGNATURE).unwrap();
        let hash = sha256_file(&dir.join(artifact)).unwrap();
        let manifest = write_manifest(
            &dir,
            artifact,
            &hash,
            &expected_signature_filename(artifact),
        );

        let result = verify_vm_manifest_at_with_policy(&manifest, true, Some(TEST_PUBLIC_KEY));

        assert!(result.ok, "{}", result.message);
        assert_eq!(result.message, "VM image hash and release signature verified.");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rejects_missing_release_signature_file() {
        let dir = temp_case_dir("missing-signature");
        let artifact = "image.bin";
        fs::write(dir.join(artifact), b"test").unwrap();
        let hash = sha256_file(&dir.join(artifact)).unwrap();
        let manifest = write_manifest(
            &dir,
            artifact,
            &hash,
            &expected_signature_filename(artifact),
        );

        let result = verify_vm_manifest_at_with_policy(&manifest, true, Some(TEST_PUBLIC_KEY));

        assert!(!result.ok);
        assert!(result.message.contains("not found"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rejects_wrong_release_signature() {
        let dir = temp_case_dir("wrong-signature");
        let artifact = "image.bin";
        fs::write(dir.join(artifact), b"Test").unwrap();
        fs::write(dir.join(expected_signature_filename(artifact)), TEST_SIGNATURE).unwrap();
        let hash = sha256_file(&dir.join(artifact)).unwrap();
        let manifest = write_manifest(
            &dir,
            artifact,
            &hash,
            &expected_signature_filename(artifact),
        );

        let result = verify_vm_manifest_at_with_policy(&manifest, true, Some(TEST_PUBLIC_KEY));

        assert!(!result.ok);
        assert!(result.message.contains("signature verification failed"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rejects_inconsistent_signature_filename() {
        let dir = temp_case_dir("signature-name");
        let artifact = "image.bin";
        fs::write(dir.join(artifact), b"test").unwrap();
        fs::write(dir.join("image.minisig"), TEST_SIGNATURE).unwrap();
        let hash = sha256_file(&dir.join(artifact)).unwrap();
        let manifest = write_manifest(&dir, artifact, &hash, "image.minisig");

        let result = verify_vm_manifest_at_with_policy(&manifest, true, Some(TEST_PUBLIC_KEY));

        assert!(!result.ok);
        assert!(result.message.contains("signature filename"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rejects_release_without_pinned_public_key() {
        let dir = temp_case_dir("missing-public-key");
        let artifact = "image.bin";
        fs::write(dir.join(artifact), b"test").unwrap();
        fs::write(dir.join(expected_signature_filename(artifact)), TEST_SIGNATURE).unwrap();
        let hash = sha256_file(&dir.join(artifact)).unwrap();
        let manifest = write_manifest(
            &dir,
            artifact,
            &hash,
            &expected_signature_filename(artifact),
        );

        let result = verify_vm_manifest_at_with_policy(&manifest, true, None);

        assert!(!result.ok);
        assert!(result.message.contains("public key"));
        let _ = fs::remove_dir_all(dir);
    }
}
