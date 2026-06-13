use argon2::Argon2;
use rand::RngCore;
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const VAULT_VERSION: u32 = 1;
const EXPORT_VERSION: u32 = 1;
const NONCE_LEN: usize = 24;
const DEVICE_KEY_LEN: usize = 32;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSecret {
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub auth_header: Option<String>,
    #[serde(default)]
    pub auth_mode: Option<String>,
    #[serde(default)]
    pub codex_account_id: Option<String>,
    #[serde(default)]
    pub refresh_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct VaultPayload {
    version: u32,
    secrets: HashMap<String, ProviderSecret>,
}

pub struct VaultState {
    pub path: PathBuf,
    pub device_key_path: PathBuf,
    storage_mode: VaultStorageMode,
    key: [u8; DEVICE_KEY_LEN],
    payload: VaultPayload,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VaultStorageMode {
    OsKeychain,
    FallbackFile,
}

impl VaultStorageMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::OsKeychain => "os-keychain",
            Self::FallbackFile => "fallback-file",
        }
    }
}

struct LoadedDeviceKey {
    key: [u8; DEVICE_KEY_LEN],
    storage_mode: VaultStorageMode,
}

impl VaultState {
    pub fn init(app: &AppHandle) -> Result<Self, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join("vault.enc");
        let device_key_path = dir.join("device.key");
        let device_key = load_or_create_device_key(&device_key_path)?;
        let payload = if path.exists() {
            match decrypt_vault(&path, &device_key.key) {
                Ok(payload) => payload,
                Err(error) => {
                    let backup = quarantine_corrupt_vault(&path)?;
                    eprintln!(
                        "[vault] WARN: could not decrypt vault ({error}). Preserved backup at {} and started a new empty vault.",
                        backup.display()
                    );
                    VaultPayload {
                        version: VAULT_VERSION,
                        secrets: HashMap::new(),
                    }
                }
            }
        } else {
            VaultPayload {
                version: VAULT_VERSION,
                secrets: HashMap::new(),
            }
        };
        Ok(Self {
            path,
            device_key_path,
            storage_mode: device_key.storage_mode,
            key: device_key.key,
            payload,
        })
    }

    pub fn status(&self) -> serde_json::Value {
        serde_json::json!({
            "unlocked": true,
            "version": self.payload.version,
            "secretCount": self.payload.secrets.len(),
            "deviceBound": true,
            "keyStorage": self.storage_mode.as_str(),
            "fallbackFile": self.storage_mode == VaultStorageMode::FallbackFile,
            "legacyDeviceKeyFilePresent": self.device_key_path.exists(),
        })
    }

    pub fn has_secret(&self, provider_id: &str) -> bool {
        self.payload
            .secrets
            .get(provider_id)
            .map(|s| {
                s.api_key.as_ref().is_some_and(|k| !k.trim().is_empty())
                    || provider_id == "ollama"
            })
            .unwrap_or(provider_id == "ollama")
    }

    pub fn get_secret(&self, provider_id: &str) -> Option<ProviderSecret> {
        if provider_id == "ollama" {
            return Some(ProviderSecret {
                api_key: None,
                base_url: Some("http://127.0.0.1:11434".into()),
                auth_header: None,
                auth_mode: None,
                codex_account_id: None,
                refresh_token: None,
            });
        }
        self.payload.secrets.get(provider_id).cloned()
    }

    pub fn set_secret(
        &mut self,
        provider_id: &str,
        api_key: Option<String>,
        base_url: Option<String>,
        auth_mode: Option<String>,
    ) -> Result<(), String> {
        if provider_id == "ollama" {
            let entry = self
                .payload
                .secrets
                .entry(provider_id.to_string())
                .or_default();
            entry.base_url = base_url.or(Some("http://127.0.0.1:11434".into()));
            return self.persist();
        }
        let trimmed = api_key.filter(|k| !k.trim().is_empty());
        if trimmed.is_none() && base_url.is_none() {
            self.payload.secrets.remove(provider_id);
        } else {
            let entry = self
                .payload
                .secrets
                .entry(provider_id.to_string())
                .or_default();
            if let Some(k) = trimmed {
                entry.api_key = Some(k);
            }
            if let Some(u) = base_url.filter(|b| !b.trim().is_empty()) {
                entry.base_url = Some(u);
            }
            if let Some(mode) = auth_mode.filter(|m| !m.trim().is_empty()) {
                let is_codex = mode == "codex-account";
                entry.auth_mode = Some(mode);
                if !is_codex {
                    entry.codex_account_id = None;
                    entry.refresh_token = None;
                }
            }
        }
        self.persist()
    }

    pub fn set_codex_credentials(
        &mut self,
        provider_id: &str,
        access_token: String,
        account_id: Option<String>,
        refresh_token: Option<String>,
    ) -> Result<(), String> {
        let entry = self
            .payload
            .secrets
            .entry(provider_id.to_string())
            .or_default();
        entry.api_key = Some(access_token);
        entry.auth_mode = Some("codex-account".into());
        entry.codex_account_id = account_id.filter(|s| !s.trim().is_empty());
        entry.refresh_token = refresh_token.filter(|s| !s.trim().is_empty());
        self.persist()
    }

    pub fn clear_secret(&mut self, provider_id: &str) -> Result<(), String> {
        if provider_id == "ollama" {
            if let Some(entry) = self.payload.secrets.get_mut(provider_id) {
                entry.api_key = None;
            }
            return self.persist();
        }
        self.payload.secrets.remove(provider_id);
        self.persist()
    }

    pub fn export(&self, password: &str) -> Result<Vec<u8>, String> {
        if password.len() < 8 {
            return Err("Export password must be at least 8 characters.".into());
        }
        let plaintext = serde_json::to_vec(&self.payload).map_err(|e| e.to_string())?;
        let mut salt = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut salt);
        let argon2 = Argon2::default();
        let mut key = [0u8; DEVICE_KEY_LEN];
        argon2
            .hash_password_into(password.as_bytes(), &salt, &mut key)
            .map_err(|e| e.to_string())?;
        let mut nonce = [0u8; NONCE_LEN];
        rand::thread_rng().fill_bytes(&mut nonce);
        let cipher = XChaCha20Poly1305::new_from_slice(&key).map_err(|e| e.to_string())?;
        let ciphertext = cipher
            .encrypt(XNonce::from_slice(&nonce), plaintext.as_ref())
            .map_err(|e| e.to_string())?;
        let export = serde_json::json!({
            "version": EXPORT_VERSION,
            "kdf": "argon2id",
            "salt": B64.encode(salt),
            "nonce": B64.encode(nonce),
            "ciphertext": B64.encode(ciphertext),
        });
        serde_json::to_vec_pretty(&export).map_err(|e| e.to_string())
    }

    pub fn import(&mut self, data: &[u8], password: &str) -> Result<(), String> {
        let doc: serde_json::Value =
            serde_json::from_slice(data).map_err(|_| "Invalid export file.".to_string())?;
        let version = doc.get("version").and_then(|v| v.as_u64()).unwrap_or(0);
        if version != EXPORT_VERSION as u64 {
            return Err("Unsupported export version.".into());
        }
        let salt_b64 = doc
            .get("salt")
            .and_then(|v| v.as_str())
            .ok_or("Missing salt.")?;
        let nonce_b64 = doc
            .get("nonce")
            .and_then(|v| v.as_str())
            .ok_or("Missing nonce.")?;
        let ciphertext_b64 = doc
            .get("ciphertext")
            .and_then(|v| v.as_str())
            .ok_or("Missing ciphertext.")?;
        let salt = B64.decode(salt_b64).map_err(|e| e.to_string())?;
        let argon2 = Argon2::default();
        let mut key = [0u8; DEVICE_KEY_LEN];
        argon2
            .hash_password_into(password.as_bytes(), &salt, &mut key)
            .map_err(|_| "Wrong export password or corrupted file.".to_string())?;
        let nonce = B64.decode(nonce_b64).map_err(|e| e.to_string())?;
        let ciphertext = B64.decode(ciphertext_b64).map_err(|e| e.to_string())?;
        let cipher = XChaCha20Poly1305::new_from_slice(&key).map_err(|e| e.to_string())?;
        let plaintext = cipher
            .decrypt(XNonce::from_slice(&nonce), ciphertext.as_ref())
            .map_err(|_| "Wrong export password or corrupted file.".to_string())?;
        self.payload = serde_json::from_slice(&plaintext).map_err(|e| e.to_string())?;
        self.persist()
    }

    fn persist(&self) -> Result<(), String> {
        encrypt_vault(&self.path, &self.key, &self.payload)
    }
}

fn quarantine_corrupt_vault(path: &Path) -> Result<PathBuf, String> {
    let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%SZ");
    let backup = path.with_file_name(format!("vault.enc.corrupt-{stamp}"));
    fs::rename(path, &backup)
        .map_err(|e| format!("Failed to preserve unreadable vault before reset: {e}"))?;
    Ok(backup)
}

fn read_fallback_device_key(path: &Path) -> Result<[u8; DEVICE_KEY_LEN], String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() != DEVICE_KEY_LEN {
        return Err("Legacy device key file is corrupt.".into());
    }
    enforce_fallback_key_permissions(path)?;
    let mut key = [0u8; DEVICE_KEY_LEN];
    key.copy_from_slice(&bytes);
    Ok(key)
}

#[cfg(unix)]
fn enforce_fallback_key_permissions(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())
}

#[cfg(not(unix))]
fn enforce_fallback_key_permissions(_path: &Path) -> Result<(), String> {
    Ok(())
}

fn write_fallback_device_key(path: &Path, key: &[u8; DEVICE_KEY_LEN]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    #[cfg(unix)]
    let mut file = {
        use std::os::unix::fs::OpenOptionsExt;
        OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(path)
    };

    #[cfg(not(unix))]
    let mut file = OpenOptions::new().write(true).create_new(true).open(path);

    match file.as_mut() {
        Ok(file) => {
            file.write_all(key).map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())?;
        }
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            return Err("Fallback device key already exists.".into());
        }
        Err(error) => return Err(error.to_string()),
    }

    enforce_fallback_key_permissions(path)
}

fn load_or_create_fallback_device_key(path: &Path) -> Result<LoadedDeviceKey, String> {
    if path.exists() {
        return Ok(LoadedDeviceKey {
            key: read_fallback_device_key(path)?,
            storage_mode: VaultStorageMode::FallbackFile,
        });
    }

    let mut key = [0u8; DEVICE_KEY_LEN];
    rand::thread_rng().fill_bytes(&mut key);
    write_fallback_device_key(path, &key)?;
    Ok(LoadedDeviceKey {
        key,
        storage_mode: VaultStorageMode::FallbackFile,
    })
}

fn load_or_create_device_key(path: &Path) -> Result<LoadedDeviceKey, String> {
    const KEYRING_SERVICE: &str = "Aura Work";
    const KEYRING_USER: &str = "device-vault-key";

    let entry = match keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER) {
        Ok(entry) => entry,
        Err(error) => {
            eprintln!("[vault] WARN: OS secure storage unavailable ({error}). Using restricted fallback file.");
            return load_or_create_fallback_device_key(path);
        }
    };

    if let Ok(stored) = entry.get_password() {
        if let Ok(bytes) = B64.decode(stored.trim()) {
            if bytes.len() == DEVICE_KEY_LEN {
                let mut key = [0u8; DEVICE_KEY_LEN];
                key.copy_from_slice(&bytes);
                return Ok(LoadedDeviceKey {
                    key,
                    storage_mode: VaultStorageMode::OsKeychain,
                });
            }
        }
        return Err(
            "Device key in OS secure storage is corrupt. Restore from an export or reset the vault.".into(),
        );
    }

    if path.exists() {
        let key = read_fallback_device_key(path)?;
        let encoded = B64.encode(key);
        if let Err(error) = entry.set_password(&encoded) {
            eprintln!(
                "[vault] WARN: failed to migrate device key to OS secure storage ({error}). Keeping restricted fallback file."
            );
            return Ok(LoadedDeviceKey {
                key,
                storage_mode: VaultStorageMode::FallbackFile,
            });
        }
        match entry.get_password() {
            Ok(stored) if stored.trim() == encoded => {}
            _ => {
                eprintln!(
                    "[vault] WARN: device key migration verification failed. Keeping restricted fallback file."
                );
                return Ok(LoadedDeviceKey {
                    key,
                    storage_mode: VaultStorageMode::FallbackFile,
                });
            }
        }
        fs::remove_file(path).map_err(|e| e.to_string())?;
        return Ok(LoadedDeviceKey {
            key,
            storage_mode: VaultStorageMode::OsKeychain,
        });
    }

    let mut key = [0u8; DEVICE_KEY_LEN];
    rand::thread_rng().fill_bytes(&mut key);
    if let Err(error) = entry.set_password(&B64.encode(key)) {
        eprintln!("[vault] WARN: OS secure storage unavailable ({error}). Using restricted fallback file.");
        write_fallback_device_key(path, &key)?;
        return Ok(LoadedDeviceKey {
            key,
            storage_mode: VaultStorageMode::FallbackFile,
        });
    }
    Ok(LoadedDeviceKey {
        key,
        storage_mode: VaultStorageMode::OsKeychain,
    })
}

fn encrypt_vault(path: &Path, key: &[u8; DEVICE_KEY_LEN], payload: &VaultPayload) -> Result<(), String> {
    let plaintext = serde_json::to_vec(payload).map_err(|e| e.to_string())?;
    let mut nonce = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce);
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|e| e.to_string())?;
    let ciphertext = cipher
        .encrypt(XNonce::from_slice(&nonce), plaintext.as_ref())
        .map_err(|e| e.to_string())?;
    let mut out = Vec::with_capacity(4 + NONCE_LEN + ciphertext.len());
    out.extend_from_slice(&VAULT_VERSION.to_le_bytes());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ciphertext);
    fs::write(path, out).map_err(|e| e.to_string())
}

fn decrypt_vault(path: &Path, key: &[u8; DEVICE_KEY_LEN]) -> Result<VaultPayload, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() < 4 + NONCE_LEN + 16 {
        return Err("Vault file is corrupt.".into());
    }
    let version = u32::from_le_bytes(bytes[0..4].try_into().unwrap());
    if version != VAULT_VERSION {
        return Err(format!("Unsupported vault version {version}."));
    }
    let nonce = &bytes[4..4 + NONCE_LEN];
    let ciphertext = &bytes[4 + NONCE_LEN..];
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|e| e.to_string())?;
    let plaintext = cipher
        .decrypt(XNonce::from_slice(nonce), ciphertext)
        .map_err(|_| "Failed to decrypt vault.".to_string())?;
    serde_json::from_slice(&plaintext).map_err(|e| e.to_string())
}

pub fn derive_fingerprint(input: &str) -> String {
    let digest = Sha256::digest(input.as_bytes());
    format!("{:x}", digest)[..12].to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_vault_dir(name: &str) -> PathBuf {
        let unique = format!(
            "aura-vault-test-{name}-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        );
        let dir = std::env::temp_dir().join(unique);
        fs::create_dir_all(&dir).expect("temp dir");
        dir
    }

    #[test]
    fn fallback_device_key_round_trips() {
        let dir = temp_vault_dir("roundtrip");
        let path = dir.join("device.key");
        let key = [7u8; DEVICE_KEY_LEN];

        write_fallback_device_key(&path, &key).expect("write fallback key");
        let loaded = read_fallback_device_key(&path).expect("read fallback key");

        assert_eq!(loaded, key);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn fallback_device_key_rejects_corrupt_length() {
        let dir = temp_vault_dir("corrupt");
        let path = dir.join("device.key");
        fs::write(&path, [1u8; DEVICE_KEY_LEN - 1]).expect("write corrupt key");

        let error = read_fallback_device_key(&path).expect_err("corrupt key should fail");

        assert!(error.contains("corrupt"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn status_reports_fallback_storage_mode() {
        let dir = temp_vault_dir("status");
        let state = VaultState {
            path: dir.join("vault.enc"),
            device_key_path: dir.join("device.key"),
            storage_mode: VaultStorageMode::FallbackFile,
            key: [0u8; DEVICE_KEY_LEN],
            payload: VaultPayload {
                version: VAULT_VERSION,
                secrets: HashMap::new(),
            },
        };

        let status = state.status();

        assert_eq!(status["keyStorage"], "fallback-file");
        assert_eq!(status["fallbackFile"], true);
        assert_eq!(status["deviceBound"], true);
        assert_eq!(status["legacyDeviceKeyFilePresent"], false);
        let _ = fs::remove_dir_all(dir);
    }

    #[cfg(unix)]
    #[test]
    fn fallback_device_key_uses_owner_only_permissions() {
        use std::os::unix::fs::PermissionsExt;

        let dir = temp_vault_dir("permissions");
        let path = dir.join("device.key");
        let key = [9u8; DEVICE_KEY_LEN];

        write_fallback_device_key(&path, &key).expect("write fallback key");
        let mode = fs::metadata(&path).expect("metadata").permissions().mode() & 0o777;

        assert_eq!(mode, 0o600);
        let _ = fs::remove_dir_all(dir);
    }
}
