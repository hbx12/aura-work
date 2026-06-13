use crate::db::DbState;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

const CURATED_PRICING_URL: &str =
    "https://raw.githubusercontent.com/aura-os/pricing/main/pricing-v1.json";
const OPENROUTER_MODELS_URL: &str = "https://openrouter.ai/api/v1/models";

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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingFileModel {
    provider_id: String,
    model_id: String,
    display_name: Option<String>,
    input_per_million: Option<f64>,
    output_per_million: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterCatalog {
    data: Vec<OpenRouterModel>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterModel {
    id: String,
    name: Option<String>,
    pricing: Option<OpenRouterPricing>,
}

#[derive(Debug, Default, Deserialize)]
struct OpenRouterPricing {
    prompt: Option<PriceValue>,
    completion: Option<PriceValue>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum PriceValue {
    Number(f64),
    Text(String),
}

impl PriceValue {
    fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Number(value) => Some(*value),
            Self::Text(value) => value.parse::<f64>().ok(),
        }
        .filter(|value| value.is_finite() && *value >= 0.0)
    }
}

fn upsert_models(
    conn: &rusqlite::Connection,
    models: &[PricingFileModel],
    source: &str,
) -> Result<usize, String> {
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

fn load_pricing_json(
    json: &str,
    source: &str,
    conn: &rusqlite::Connection,
) -> Result<usize, String> {
    let file: PricingFile = serde_json::from_str(json).map_err(|e| e.to_string())?;
    upsert_models(conn, &file.models, source)
}

fn price_per_million(value: Option<&PriceValue>) -> Option<f64> {
    value.and_then(PriceValue::as_f64).map(|value| value * 1_000_000.0)
}

fn provider_alias(model_id: &str) -> Option<&'static str> {
    if model_id.starts_with("deepseek/") {
        Some("deepseek")
    } else if model_id.starts_with("openai/") {
        Some("openai")
    } else if model_id.starts_with("anthropic/") {
        Some("anthropic")
    } else if model_id.starts_with("google/") {
        Some("gemini")
    } else {
        None
    }
}

fn parse_openrouter_models(json: &str) -> Result<Vec<PricingFileModel>, String> {
    let catalog: OpenRouterCatalog = serde_json::from_str(json).map_err(|e| e.to_string())?;
    let mut models = Vec::new();

    for model in catalog.data {
        let pricing = model.pricing.unwrap_or_default();
        let input_per_million = price_per_million(pricing.prompt.as_ref());
        let output_per_million = price_per_million(pricing.completion.as_ref());

        if input_per_million.is_none() && output_per_million.is_none() {
            continue;
        }

        let base = PricingFileModel {
            provider_id: "openai-compatible".into(),
            model_id: model.id.clone(),
            display_name: model.name.clone(),
            input_per_million,
            output_per_million,
        };
        models.push(base.clone());

        if let Some(alias) = provider_alias(&model.id) {
            models.push(PricingFileModel {
                provider_id: alias.into(),
                ..base
            });
        }
    }

    Ok(models)
}

async fn fetch_text(client: &reqwest::Client, url: &str) -> Option<String> {
    match client.get(url).send().await {
        Ok(response) if response.status().is_success() => response.text().await.ok(),
        _ => None,
    }
}

pub async fn refresh_remote_pricing(db: &DbState) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("Aura Work pricing refresh")
        .build()
        .map_err(|e| e.to_string())?;

    let curated = fetch_text(&client, CURATED_PRICING_URL).await;
    let openrouter = fetch_text(&client, OPENROUTER_MODELS_URL).await;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut updated = load_pricing_json(BUNDLED_PRICING, "bundled", &conn)?;
    let mut sources = vec!["bundled"];

    if let Some(text) = curated {
        if let Ok(count) = load_pricing_json(&text, "curated", &conn) {
            updated += count;
            sources.push("curated");
        }
    }

    if let Some(text) = openrouter {
        if let Ok(models) = parse_openrouter_models(&text) {
            updated += upsert_models(&conn, &models, "openrouter")?;
            sources.push("openrouter");
        }
    }

    Ok(serde_json::json!({
        "updated": updated,
        "sources": sources,
        "message": "Pricing cache refreshed from available sources."
    }))
}

pub fn seed_pricing_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pricing_cache", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count == 0 {
        load_pricing_json(BUNDLED_PRICING, "bundled", conn)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn fetch_pricing(db: State<'_, DbState>) -> Result<serde_json::Value, String> {
    refresh_remote_pricing(&db).await
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

fn pricing_query(
    conn: &rusqlite::Connection,
    provider_id: &str,
    model_id: &str,
) -> Result<Option<(Option<f64>, Option<f64>)>, String> {
    conn.query_row(
        "SELECT input_per_million, output_per_million FROM pricing_cache
         WHERE provider_id = ?1 AND model_id = ?2",
        params![provider_id, model_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional()
    .map_err(|e| e.to_string())
}

pub fn pricing_for_model(
    db: &DbState,
    provider_id: &str,
    model_id: &str,
) -> Result<(Option<f64>, Option<f64>), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    if let Some(pricing) = pricing_query(&conn, provider_id, model_id)? {
        return Ok(pricing);
    }

    if let Some(pricing) = pricing_query(&conn, "openai-compatible", model_id)? {
        return Ok(pricing);
    }

    conn.query_row(
        "SELECT input_per_million, output_per_million FROM pricing_cache
         WHERE model_id = ?1
         ORDER BY CASE source WHEN 'openrouter' THEN 0 WHEN 'curated' THEN 1 ELSE 2 END
         LIMIT 1",
        params![model_id],
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
