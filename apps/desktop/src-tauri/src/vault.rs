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
use std::fs;
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
    key: [u8; DEVICE_KEY_LEN],
    payload: VaultPayload,
}

impl VaultState {
    pub fn init(app: &AppHandle) -> Result<Self, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join("vault.enc");
        let device_key_path = dir.join("device.key");
        let key = load_or_create_device_key(&device_key_path)?;
        let payload = if path.exists() {
            decrypt_vault(&path, &key)?
        } else {
            VaultPayload {
                version: VAULT_VERSION,
                secrets: HashMap::new(),
            }
        };
        Ok(Self {
            path,
            device_key_path,
            key,
            payload,
        })
    }

    pub fn status(&self) -> serde_json::Value {
        serde_json::json!({
            "unlocked": true,
            "version": self.payload.version,
            "secretCount": self.payload.secrets.len(),
            "deviceBound": self.device_key_path.exists(),
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

fn load_or_create_device_key(path: &Path) -> Result<[u8; DEVICE_KEY_LEN], String> {
    const KEYRING_SERVICE: &str = "Aura Work";
    const KEYRING_USER: &str = "device-vault-key";

    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;

    if let Ok(stored) = entry.get_password() {
        if let Ok(bytes) = B64.decode(stored.trim()) {
            if bytes.len() == DEVICE_KEY_LEN {
                let mut key = [0u8; DEVICE_KEY_LEN];
                key.copy_from_slice(&bytes);
                return Ok(key);
            }
        }
        return Err(
            "Device key in OS secure storage is corrupt. Restore from an export or reset the vault.".into(),
        );
    }

    if path.exists() {
        let bytes = fs::read(path).map_err(|e| e.to_string())?;
        if bytes.len() != DEVICE_KEY_LEN {
            return Err("Legacy device key file is corrupt.".into());
        }
        let encoded = B64.encode(&bytes);
        entry
            .set_password(&encoded)
            .map_err(|e| format!("Failed to migrate device key to OS secure storage: {e}"))?;
        if entry.get_password().is_err() {
            return Err("Device key migration verification failed.".into());
        }
        fs::remove_file(path).map_err(|e| e.to_string())?;
        let mut key = [0u8; DEVICE_KEY_LEN];
        key.copy_from_slice(&bytes);
        return Ok(key);
    }

    let mut key = [0u8; DEVICE_KEY_LEN];
    rand::thread_rng().fill_bytes(&mut key);
    entry
        .set_password(&B64.encode(key))
        .map_err(|e| {
            if path.parent().is_some() {
                let _ = fs::write(path, key);
            }
            format!(
                "OS secure storage unavailable ({e}). Device key stored in legacy file with restricted permissions — not recommended for production."
            )
        })?;
    Ok(key)
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
