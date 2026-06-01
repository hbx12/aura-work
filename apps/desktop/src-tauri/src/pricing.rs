use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

const PRICING_URL: &str =
    "https://raw.githubusercontent.com/aura-os/pricing/main/pricing-v1.json";

const BUNDLED_PRICING: &str = include_str!("../resources/pricing-v1.json");

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PricingModel {
    pub provider_id: String,
    pub model_id: String,
    pub display_name: Option<String>,
    pub input_per_million: Option<f64>,
    pub output_per_million: Option<f64>,
    pub currency: String,
    pub source: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
struct PricingFile {
    models: Vec<PricingFileModel>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingFileModel {
    provider_id: String,
    model_id: String,
    display_name: Option<String>,
    input_per_million: Option<f64>,
    output_per_million: Option<f64>,
}

fn upsert_models(conn: &rusqlite::Connection, models: &[PricingFileModel], source: &str) -> Result<usize, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut count = 0usize;
    for m in models {
        conn.execute(
            "INSERT INTO pricing_cache
             (provider_id, model_id, display_name, input_per_million, output_per_million, currency, source, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'USD', ?6, ?7)
             ON CONFLICT(provider_id, model_id) DO UPDATE SET
               display_name = excluded.display_name,
               input_per_million = excluded.input_per_million,
               output_per_million = excluded.output_per_million,
               source = excluded.source,
               updated_at = excluded.updated_at",
            params![
                m.provider_id,
                m.model_id,
                m.display_name,
                m.input_per_million,
                m.output_per_million,
                source,
                now
            ],
        )
        .map_err(|e| e.to_string())?;
        count += 1;
    }
    Ok(count)
}

fn load_pricing_json(json: &str, source: &str, conn: &rusqlite::Connection) -> Result<usize, String> {
    let file: PricingFile = serde_json::from_str(json).map_err(|e| e.to_string())?;
    upsert_models(conn, &file.models, source)
}

pub fn seed_pricing_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pricing_cache", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count == 0 {
        load_pricing_json(BUNDLED_PRICING, "auto", conn)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn fetch_pricing(db: State<'_, DbState>) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let fetched = client.get(PRICING_URL).send().await;
    let json_text = match fetched {
        Ok(resp) if resp.status().is_success() => {
            Some((resp.text().await.map_err(|e| e.to_string())?, "remote"))
        }
        _ => None,
    };
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    if let Some((text, source)) = json_text {
        let count = load_pricing_json(&text, "auto", &conn)?;
        Ok(serde_json::json!({ "updated": count, "source": source }))
    } else {
        let count = load_pricing_json(BUNDLED_PRICING, "auto", &conn)?;
        Ok(serde_json::json!({
            "updated": count,
            "source": "bundled",
            "message": "Remote pricing unavailable; using bundled cache."
        }))
    }
}

pub fn list_pricing_models(db: &DbState) -> Result<Vec<PricingModel>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    read_pricing(&conn)
}

#[tauri::command]
pub fn list_pricing(db: State<'_, DbState>) -> Result<Vec<PricingModel>, String> {
    list_pricing_models(&db)
}

fn read_pricing(conn: &rusqlite::Connection) -> Result<Vec<PricingModel>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT provider_id, model_id, display_name, input_per_million, output_per_million,
                    currency, source, updated_at
             FROM pricing_cache ORDER BY provider_id, model_id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(PricingModel {
                provider_id: row.get(0)?,
                model_id: row.get(1)?,
                display_name: row.get(2)?,
                input_per_million: row.get(3)?,
                output_per_million: row.get(4)?,
                currency: row.get(5)?,
                source: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn pricing_for_model(
    db: &DbState,
    provider_id: &str,
    model_id: &str,
) -> Result<(Option<f64>, Option<f64>), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT input_per_million, output_per_million FROM pricing_cache
         WHERE provider_id = ?1 AND model_id = ?2",
        params![provider_id, model_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .map_err(|_| "Pricing not found.".to_string())
}

pub fn estimate_cost(
    input_tokens: u64,
    output_tokens: u64,
    input_rate: Option<f64>,
    output_rate: Option<f64>,
) -> Option<f64> {
    match (input_rate, output_rate) {
        (Some(i), Some(o)) => {
            Some((input_tokens as f64 * i + output_tokens as f64 * o) / 1_000_000.0)
        }
        _ => None,
    }
}
