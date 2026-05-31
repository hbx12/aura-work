use crate::bridge::{
    after_pair_claim, internal_create_task, internal_get_task, internal_get_task_logs,
    internal_list_projects, internal_open_task, internal_page_read_request, internal_page_read_status,
    internal_page_read_submit, internal_pair_claim, BridgeTaskCreateInput, PageReadRequestInput,
    PageReadSubmitInput, PairClaimInput,
};
use crate::db::DbState;
use crate::providers::VaultHandle;
use serde_json::Value;
use std::io::Read;
use std::sync::Arc;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

pub struct BridgeRuntime {
    pub db: DbState,
    pub vault: VaultHandle,
    pub internal_secret: String,
}

const INTERNAL_PORT: u16 = 47827;

pub fn start_server(runtime: Arc<BridgeRuntime>) {
    std::thread::spawn(move || {
        let addr = format!("127.0.0.1:{INTERNAL_PORT}");
        let server = match Server::http(&addr) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[aura-bridge-internal] failed to bind {addr}: {e}");
                return;
            }
        };
        eprintln!("[aura-bridge-internal] listening on {addr}");
        for request in server.incoming_requests() {
            let runtime = Arc::clone(&runtime);
            if let Err(e) = handle_request(&runtime, request) {
                eprintln!("[aura-bridge-internal] {e}");
            }
        }
    });
}

fn handle_request(runtime: &Arc<BridgeRuntime>, mut request: Request) -> Result<(), String> {
    let secret = request
        .headers()
        .iter()
        .find(|h| h.field.equiv("X-Aura-Bridge-Secret"))
        .map(|h| h.value.as_str())
        .unwrap_or("");
    if secret != runtime.internal_secret {
        return respond_json(
            request,
            StatusCode(401),
            serde_json::json!({ "error": "Unauthorized bridge internal request." }),
        );
    }

    let path = request.url().split('?').next().unwrap_or("/").to_string();
    let method = request.method().clone();
    let body = read_body(&mut request.as_reader())?;

    match (method, path.as_str()) {
        (Method::Get, "/health") => respond_json(
            request,
            StatusCode(200),
            serde_json::json!({
                "status": "ok",
                "phase": 14,
                "port": INTERNAL_PORT,
            }),
        ),
        (Method::Post, "/internal/pair/claim") => {
            let input: PairClaimInput = parse_json(&body)?;
            let result = internal_pair_claim(&runtime.db, &input)?;
            let db = runtime.db.clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new();
                if let Ok(rt) = rt {
                    let _ = rt.block_on(after_pair_claim(&db));
                }
            });
            respond_json(request, StatusCode(200), serde_json::to_value(result).unwrap())
        }
        (Method::Post, "/internal/chrome/page-read/request") => {
            let input: PageReadRequestInput = parse_json(&body)?;
            let result = internal_page_read_request(&runtime.db, &input)?;
            respond_json(request, StatusCode(200), serde_json::to_value(result).unwrap())
        }
        (Method::Get, p) if p.starts_with("/internal/chrome/page-read/status/") => {
            let permission_id = p.trim_start_matches("/internal/chrome/page-read/status/");
            let token = query_param(request.url(), "sessionToken").unwrap_or_default();
            let result = internal_page_read_status(&runtime.db, &token, permission_id)?;
            respond_json(request, StatusCode(200), serde_json::to_value(result).unwrap())
        }
        (Method::Post, "/internal/chrome/page-read/submit") => {
            let input: PageReadSubmitInput = parse_json(&body)?;
            let result = internal_page_read_submit(&runtime.db, &input)?;
            respond_json(request, StatusCode(200), serde_json::to_value(result).unwrap())
        }
        (Method::Post, "/internal/task/create") => {
            let input: BridgeTaskCreateInput = parse_json(&body)?;
            let db = runtime.db.clone();
            let vault = runtime.vault.clone();
            let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
            let result = rt.block_on(internal_create_task(&db, &vault, &input))?;
            respond_json(request, StatusCode(200), serde_json::to_value(result).unwrap())
        }
        (Method::Get, p) if p.starts_with("/internal/task/") && p.ends_with("/logs") => {
            let task_id = p
                .trim_start_matches("/internal/task/")
                .trim_end_matches("/logs")
                .trim_end_matches('/');
            let token = query_param(request.url(), "sessionToken").unwrap_or_default();
            let limit = query_param(request.url(), "limit")
                .and_then(|s| s.parse().ok());
            let result = internal_get_task_logs(&runtime.db, &token, task_id, limit)?;
            respond_json(request, StatusCode(200), serde_json::to_value(result).unwrap())
        }
        (Method::Post, "/internal/open/task") => {
            #[derive(serde::Deserialize)]
            #[serde(rename_all = "camelCase")]
            struct OpenTaskInput {
                session_token: String,
                task_id: String,
            }
            let input: OpenTaskInput = parse_json(&body)?;
            internal_open_task(&runtime.db, &input.session_token, &input.task_id)?;
            respond_json(request, StatusCode(200), serde_json::json!({ "ok": true }))
        }
        (Method::Get, p) if p.starts_with("/internal/task/") => {
            let task_id = p.trim_start_matches("/internal/task/");
            if task_id.contains('/') {
                return respond_json(
                    request,
                    StatusCode(404),
                    serde_json::json!({ "error": "Not found" }),
                );
            }
            let token = query_param(request.url(), "sessionToken").unwrap_or_default();
            let result = internal_get_task(&runtime.db, &token, task_id)?;
            respond_json(request, StatusCode(200), serde_json::to_value(result).unwrap())
        }
        (Method::Get, "/internal/projects") => {
            let token = query_param(request.url(), "sessionToken").unwrap_or_default();
            let result = internal_list_projects(&runtime.db, &token)?;
            respond_json(request, StatusCode(200), serde_json::to_value(result).unwrap())
        }
        _ => respond_json(
            request,
            StatusCode(404),
            serde_json::json!({ "error": "Not found" }),
        ),
    }
}

fn read_body(reader: &mut dyn Read) -> Result<String, String> {
    let mut body = String::new();
    reader
        .read_to_string(&mut body)
        .map_err(|e| e.to_string())?;
    Ok(body)
}

fn parse_json<T: serde::de::DeserializeOwned>(body: &str) -> Result<T, String> {
    if body.trim().is_empty() {
        return Err("Empty request body.".into());
    }
    serde_json::from_str(body).map_err(|e| e.to_string())
}

fn query_param(url: &str, key: &str) -> Option<String> {
    let query = url.split('?').nth(1)?;
    for part in query.split('&') {
        let mut kv = part.splitn(2, '=');
        if kv.next()? == key {
            return kv.next().map(|v| v.to_string());
        }
    }
    None
}

fn respond_json(request: Request, status: StatusCode, body: Value) -> Result<(), String> {
    let json = serde_json::to_string(&body).map_err(|e| e.to_string())?;
    let response = Response::from_string(json)
        .with_status_code(status)
        .with_header(Header::from_bytes("Content-Type", "application/json").unwrap());
    request.respond(response).map_err(|e| e.to_string())
}
