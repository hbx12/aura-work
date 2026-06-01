use rand::RngCore;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

static SIDECAR_TOKENS: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();

fn token_store() -> &'static Mutex<HashMap<String, String>> {
    SIDECAR_TOKENS.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn generate_sidecar_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes)
}

pub fn register_sidecar_token(sidecar_id: &str, token: String) {
    if let Ok(mut map) = token_store().lock() {
        map.insert(sidecar_id.to_string(), token);
    }
}

pub fn sidecar_bearer(sidecar_id: &str) -> Option<String> {
    let map = token_store().lock().ok()?;
    map.get(sidecar_id)
        .map(|token| format!("Bearer {token}"))
}

pub fn sidecar_token(sidecar_id: &str) -> Option<String> {
    let map = token_store().lock().ok()?;
    map.get(sidecar_id).cloned()
}

pub fn authorized_reqwest(
    builder: reqwest::RequestBuilder,
    sidecar_id: &str,
) -> reqwest::RequestBuilder {
    if let Some(auth) = sidecar_bearer(sidecar_id) {
        builder.header("Authorization", auth)
    } else {
        builder
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_tokens_are_unique_and_long_enough() {
        let a = generate_sidecar_token();
        let b = generate_sidecar_token();
        assert_ne!(a, b);
        assert!(a.len() >= 32);
    }

    #[test]
    fn register_and_retrieve_token() {
        register_sidecar_token("test-sidecar", "abc123".repeat(8));
        let bearer = sidecar_bearer("test-sidecar").expect("token");
        assert!(bearer.starts_with("Bearer "));
    }
}
