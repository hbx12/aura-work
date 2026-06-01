use crate::db::DbState;
use serde::{Deserialize, Serialize};
use tauri::State;

const LOCALE_SETTING_KEY: &str = "app_locale";
const USE_SYSTEM_LOCALE_KEY: &str = "app_locale_use_system";

pub const SUPPORTED_LOCALES: &[(&str, &str, bool)] = &[
    ("en", "English", false),
    ("ar", "Arabic", true),
    ("es", "Spanish", false),
    ("fr", "French", false),
    ("de", "German", false),
    ("pt", "Portuguese", false),
    ("zh-CN", "Chinese (Simplified)", false),
    ("zh-TW", "Chinese (Traditional)", false),
    ("ja", "Japanese", false),
    ("ko", "Korean", false),
    ("hi", "Hindi", false),
    ("id", "Indonesian", false),
    ("tr", "Turkish", false),
    ("ru", "Russian", false),
    ("it", "Italian", false),
    ("nl", "Dutch", false),
    ("pl", "Polish", false),
    ("vi", "Vietnamese", false),
    ("th", "Thai", false),
    ("fa", "Persian", true),
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocaleInfo {
    pub id: String,
    pub label: String,
    pub rtl: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppLocaleSettings {
    pub locale: String,
    pub use_system_locale: bool,
    pub rtl: bool,
    pub system_locale: String,
}

fn read_setting(conn: &rusqlite::Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get(0),
    )
    .ok()
}

fn write_setting(conn: &rusqlite::Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn normalize_locale_tag(tag: &str) -> String {
    let lower = tag.trim().to_lowercase().replace('_', "-");
    for (id, _, _) in SUPPORTED_LOCALES {
        if id.to_lowercase() == lower {
            return (*id).to_string();
        }
    }
    let base = lower.split('-').next().unwrap_or("en");
    for (id, _, _) in SUPPORTED_LOCALES {
        if id.split('-').next().unwrap_or("") == base {
            return (*id).to_string();
        }
    }
    if base == "zh" {
        return if lower.contains("tw") || lower.contains("hk") || lower.contains("hant") {
            "zh-TW".into()
        } else {
            "zh-CN".into()
        };
    }
    "en".into()
}

pub fn detect_system_locale() -> String {
    if let Ok(lang) = std::env::var("LANG") {
        let tag = lang.split('.').next().unwrap_or(&lang);
        return normalize_locale_tag(tag);
    }
    if let Ok(lang) = std::env::var("LC_ALL") {
        let tag = lang.split('.').next().unwrap_or(&lang);
        return normalize_locale_tag(tag);
    }
    "en".into()
}

fn locale_rtl(locale: &str) -> bool {
    matches!(locale, "ar" | "fa")
}

pub fn resolve_app_locale(conn: &rusqlite::Connection) -> AppLocaleSettings {
    let system_locale = detect_system_locale();
    let use_system = read_setting(conn, USE_SYSTEM_LOCALE_KEY)
        .map(|v| v != "0")
        .unwrap_or(true);
    let stored = read_setting(conn, LOCALE_SETTING_KEY);
    let locale = if use_system {
        system_locale.clone()
    } else {
        stored
            .map(|s| normalize_locale_tag(&s))
            .unwrap_or_else(|| system_locale.clone())
    };
    AppLocaleSettings {
        rtl: locale_rtl(&locale),
        locale,
        use_system_locale: use_system,
        system_locale,
    }
}

#[tauri::command]
pub fn list_supported_locales() -> Vec<LocaleInfo> {
    SUPPORTED_LOCALES
        .iter()
        .map(|(id, label, rtl)| LocaleInfo {
            id: (*id).into(),
            label: (*label).into(),
            rtl: *rtl,
        })
        .collect()
}

#[tauri::command]
pub fn get_app_locale(db: State<'_, DbState>) -> Result<AppLocaleSettings, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    Ok(resolve_app_locale(&conn))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAppLocaleInput {
    pub locale: Option<String>,
    pub use_system_locale: Option<bool>,
}

#[tauri::command]
pub fn set_app_locale(db: State<'_, DbState>, input: SetAppLocaleInput) -> Result<AppLocaleSettings, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    if let Some(use_system) = input.use_system_locale {
        write_setting(&conn, USE_SYSTEM_LOCALE_KEY, if use_system { "1" } else { "0" })?;
    }
    if let Some(locale) = &input.locale {
        let normalized = normalize_locale_tag(locale);
        if !SUPPORTED_LOCALES.iter().any(|(id, _, _)| *id == normalized) {
            return Err(format!("Unsupported locale: {locale}"));
        }
        write_setting(&conn, LOCALE_SETTING_KEY, &normalized)?;
        write_setting(&conn, USE_SYSTEM_LOCALE_KEY, "0")?;
    }
    Ok(resolve_app_locale(&conn))
}

#[tauri::command]
pub fn detect_system_locale_cmd() -> String {
    detect_system_locale()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_bcp47_tags() {
        assert_eq!(normalize_locale_tag("en-US"), "en");
        assert_eq!(normalize_locale_tag("ar-SA"), "ar");
        assert_eq!(normalize_locale_tag("zh-CN"), "zh-CN");
        assert_eq!(normalize_locale_tag("  FA-IR  "), "fa");
    }

    #[test]
    fn supported_locale_count() {
        assert_eq!(SUPPORTED_LOCALES.len(), 20);
    }
}
