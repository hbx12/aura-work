use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;
use sha2::{Digest, Sha256};

const NONCE_LEN: usize = 24;
const SYNC_KEY_LEN: usize = 32;

pub fn generate_sync_key() -> [u8; SYNC_KEY_LEN] {
    let mut key = [0u8; SYNC_KEY_LEN];
    rand::thread_rng().fill_bytes(&mut key);
    key
}

pub fn generate_recovery_key() -> String {
    let mut bytes = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut bytes);
    format!("aura-{}", B64.encode(bytes).trim_end_matches('='))
}

pub fn recovery_key_fingerprint(recovery_key: &str) -> String {
    let hash = Sha256::digest(recovery_key.as_bytes());
    B64.encode(&hash[..16])
}

pub fn derive_sync_key_from_recovery(recovery_key: &str) -> [u8; SYNC_KEY_LEN] {
    let hash = Sha256::digest(recovery_key.as_bytes());
    let mut key = [0u8; SYNC_KEY_LEN];
    key.copy_from_slice(&hash[..SYNC_KEY_LEN]);
    key
}

pub fn encrypt_with_key(key: &[u8; SYNC_KEY_LEN], plaintext: &[u8]) -> Result<(String, String), String> {
    let mut nonce = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce);
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|e| e.to_string())?;
    let ciphertext = cipher
        .encrypt(XNonce::from_slice(&nonce), plaintext)
        .map_err(|e| e.to_string())?;
    Ok((B64.encode(ciphertext), B64.encode(nonce)))
}

pub fn decrypt_with_key(
    key: &[u8; SYNC_KEY_LEN],
    ciphertext_b64: &str,
    nonce_b64: &str,
) -> Result<Vec<u8>, String> {
    let ciphertext = B64.decode(ciphertext_b64).map_err(|e| e.to_string())?;
    let nonce = B64.decode(nonce_b64).map_err(|e| e.to_string())?;
    if nonce.len() != NONCE_LEN {
        return Err("Invalid nonce length".into());
    }
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|e| e.to_string())?;
    cipher
        .decrypt(XNonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|_| "Decryption failed — wrong key or corrupted data".into())
}

pub fn encrypt_sync_payload(
    sync_key: &[u8; SYNC_KEY_LEN],
    payload: &serde_json::Value,
) -> Result<(String, String), String> {
    let plaintext = serde_json::to_vec(payload).map_err(|e| e.to_string())?;
    encrypt_with_key(sync_key, &plaintext)
}

pub fn decrypt_sync_payload(
    sync_key: &[u8; SYNC_KEY_LEN],
    ciphertext_b64: &str,
    nonce_b64: &str,
) -> Result<serde_json::Value, String> {
    let plaintext = decrypt_with_key(sync_key, ciphertext_b64, nonce_b64)?;
    serde_json::from_slice(&plaintext).map_err(|e| e.to_string())
}

pub fn device_public_key_from_device_key(device_key: &[u8; 32]) -> String {
    let hash = Sha256::digest(device_key);
    B64.encode(hash)
}

pub fn protect_local_secret(device_key: &[u8; 32], secret: &str) -> Result<String, String> {
    let mut key = [0u8; SYNC_KEY_LEN];
    key.copy_from_slice(device_key);
    let (ct, nonce) = encrypt_with_key(&key, secret.as_bytes())?;
    Ok(format!("{ct}.{nonce}"))
}

pub fn unprotect_local_secret(device_key: &[u8; 32], stored: &str) -> Result<String, String> {
    let parts: Vec<&str> = stored.splitn(2, '.').collect();
    if parts.len() != 2 {
        return Err("Invalid protected secret format".into());
    }
    let mut key = [0u8; SYNC_KEY_LEN];
    key.copy_from_slice(device_key);
    let plaintext = decrypt_with_key(&key, parts[0], parts[1])?;
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}
