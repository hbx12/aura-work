use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::extensions_helper::{
    call_mcp_tool_remote, McpServerConfig, ProjectMcpSetting,
};
use crate::permissions::check_task_permission;
use crate::plugins::{push_config_to_helper, load_aura_config, APP_DATA_DIR};
use crate::VaultHandle;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerRecord {
    pub id: String,
    pub name: String,
    pub transport: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: serde_json::Map<String, serde_json::Value>,
    pub enabled: bool,
    pub created_at: String,
}

pub fn init_mcp_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS mcp_servers (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            transport TEXT NOT NULL DEFAULT 'stdio',
            command TEXT NOT NULL,
            args_json TEXT NOT NULL DEFAULT '[]',
            env_json TEXT NOT NULL DEFAULT '{}',
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS project_mcp_settings (
            project_id TEXT NOT NULL,
            server_id TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (project_id, server_id)
        );
        ",
    )
    .map_err(|e| e.to_string())
}

pub fn load_mcp_server_configs(conn: &Connection) -> Result<Vec<McpServerConfig>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, transport, command, args_json, env_json, enabled FROM mcp_servers",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let args_json: String = row.get(4)?;
            let env_json: String = row.get(5)?;
            Ok(McpServerConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                transport: row.get(2)?,
                command: row.get(3)?,
                args: serde_json::from_str(&args_json).unwrap_or_default(),
                env: serde_json::from_str(&env_json).unwrap_or_default(),
                enabled: row.get::<_, i64>(6)? != 0,
                headers: None,
                timeout: None,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn load_project_mcp_settings(conn: &Connection) -> Result<Vec<ProjectMcpSetting>, String> {
    let mut stmt = conn
        .prepare("SELECT project_id, server_id, enabled FROM project_mcp_settings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ProjectMcpSetting {
                project_id: row.get(0)?,
                server_id: row.get(1)?,
                enabled: row.get::<_, i64>(2)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn load_mcp_servers(conn: &Connection) -> Result<Vec<McpServerRecord>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, transport, command, args_json, env_json, enabled, created_at
             FROM mcp_servers ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let args_json: String = row.get(4)?;
            let env_json: String = row.get(5)?;
            Ok(McpServerRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                transport: row.get(2)?,
                command: row.get(3)?,
                args: serde_json::from_str(&args_json).unwrap_or_default(),
                env: serde_json::from_str(&env_json).unwrap_or_default(),
                enabled: row.get::<_, i64>(6)? != 0,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn is_sensitive_env_key(key: &str) -> bool {
    let upper = key.to_ascii_uppercase();
    ["KEY", "TOKEN", "SECRET", "PASSWORD", "CREDENTIAL", "AUTH"]
        .iter()
        .any(|needle| upper.contains(needle))
}

fn redact_env_for_display(
    env: serde_json::Map<String, serde_json::Value>,
) -> serde_json::Map<String, serde_json::Value> {
    env.into_iter()
        .map(|(key, value)| {
            if is_sensitive_env_key(&key) {
                (key, serde_json::Value::String("[REDACTED]".into()))
            } else {
                (key, value)
            }
        })
        .collect()
}

#[tauri::command]
pub fn list_mcp_servers(db: State<'_, DbState>) -> Result<Vec<McpServerRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut list = load_mcp_servers(&conn)?
        .into_iter()
        .map(|mut server| {
            server.env = redact_env_for_display(server.env);
            server
        })
        .collect::<Vec<_>>();

    // 1. Load global config-based servers
    if let Some(app_data) = APP_DATA_DIR.get() {
        let (global_servers, _) = load_aura_config(app_data, "");
        for s in global_servers {
            list.push(McpServerRecord {
                id: s.id,
                name: s.name,
                transport: s.transport,
                command: s.command,
                args: s.args,
                env: redact_env_for_display(s.env),
                enabled: s.enabled,
                created_at: "".to_string(),
            });
        }
    }

    // 2. Load project-specific config-based servers
    let project_settings = load_project_mcp_settings(&conn)?;
    let mut stmt = conn.prepare("SELECT id, folder_path FROM projects").map_err(|e| e.to_string())?;
    let projects: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    for (project_id, folder_path) in &projects {
        let (project_servers, _) = load_aura_config(std::path::Path::new(folder_path), project_id);
        for s in project_servers {
            if !list.iter().any(|existing| existing.id == s.id) {
                let enabled = project_settings
                    .iter()
                    .find(|setting| setting.project_id == *project_id && setting.server_id == s.id)
                    .map(|setting| setting.enabled)
                    .unwrap_or(false);
                list.push(McpServerRecord {
                    id: s.id,
                    name: s.name,
                    transport: s.transport,
                    command: s.command,
                    args: s.args,
                    env: redact_env_for_display(s.env),
                    enabled,
                    created_at: "".to_string(),
                });
            }
        }
    }

    Ok(list)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddMcpServerInput {
    pub id: Option<String>,
    pub name: String,
    pub command: String,
    pub transport: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<serde_json::Map<String, serde_json::Value>>,
}

#[tauri::command]
pub async fn add_mcp_server(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    input: AddMcpServerInput,
) -> Result<McpServerRecord, String> {
    let id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let now = chrono::Utc::now().to_rfc3339();
    let transport = input.transport.unwrap_or_else(|| "stdio".to_string());
    let args_json = serde_json::to_string(&input.args.unwrap_or_default()).map_err(|e| e.to_string())?;
    let env_json = serde_json::to_string(&input.env.unwrap_or_default()).map_err(|e| e.to_string())?;
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO mcp_servers (id, name, transport, command, args_json, env_json, enabled, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)",
            params![id, input.name, transport, input.command, args_json, env_json, now],
        )
        .map_err(|e| e.to_string())?;
        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: None,
                task_id: None,
                actor: "user".into(),
                category: "mcp".into(),
                action: "add-server".into(),
                target: Some(input.name.clone()),
                summary: format!("Added MCP server: {}", input.name),
                risk: Some("medium".into()),
                decision: None,
                result: "succeeded".into(),
                metadata: None,
            },
        )?;
    }
    let _ = push_config_to_helper(&db, Some(&vault)).await;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load_mcp_servers(&conn)?
        .into_iter()
        .find(|s| s.id == id)
        .ok_or_else(|| "MCP server not found".into())
}

#[tauri::command]
pub async fn delete_mcp_server(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    server_id: String,
) -> Result<(), String> {
    if server_id.starts_with("aura_config_") {
        return Err("Configuration-based MCP servers are read-only. Remove them from aura.json/aura.jsonc instead.".to_string());
    }
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM mcp_servers WHERE id = ?1", params![server_id])
            .map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM project_mcp_settings WHERE server_id = ?1",
            params![server_id],
        )
        .map_err(|e| e.to_string())?;
    }
    let _ = push_config_to_helper(&db, Some(&vault)).await;
    Ok(())
}

#[tauri::command]
pub async fn set_mcp_server_enabled(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    server_id: String,
    enabled: bool,
) -> Result<McpServerRecord, String> {
    if server_id.starts_with("aura_config_") {
        return Err("Configuration-based MCP servers are read-only. Edit aura.json/aura.jsonc to enable or disable them.".to_string());
    }
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE mcp_servers SET enabled = ?1 WHERE id = ?2",
            params![if enabled { 1 } else { 0 }, server_id],
        )
        .map_err(|e| e.to_string())?;
    }
    let _ = push_config_to_helper(&db, Some(&vault)).await;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load_mcp_servers(&conn)?
        .into_iter()
        .find(|s| s.id == server_id)
        .ok_or_else(|| "MCP server not found".into())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMcpToggleInput {
    pub project_id: String,
    pub server_id: String,
    pub enabled: bool,
}

#[tauri::command]
pub async fn set_project_mcp_enabled(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    input: ProjectMcpToggleInput,
) -> Result<(), String> {
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO project_mcp_settings (project_id, server_id, enabled) VALUES (?1, ?2, ?3)
             ON CONFLICT(project_id, server_id) DO UPDATE SET enabled = excluded.enabled",
            params![
                input.project_id,
                input.server_id,
                if input.enabled { 1 } else { 0 }
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    let _ = push_config_to_helper(&db, Some(&vault)).await;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMcpSettingRecord {
    pub server_id: String,
    pub enabled: bool,
}

#[tauri::command]
pub fn list_project_mcp_settings(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<Vec<ProjectMcpSettingRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT server_id, enabled FROM project_mcp_settings WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], |row| {
            Ok(ProjectMcpSettingRecord {
                server_id: row.get(0)?,
                enabled: row.get::<_, i64>(1)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// MCP tool entry used by the task engine.
pub async fn tool_mcp_call(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    server_id: &str,
    tool_name: &str,
    arguments: &serde_json::Value,
    tool_payload: Option<serde_json::Value>,
) -> Result<String, String> {
    let target = format!("{server_id}:{tool_name}");

    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let server_enabled: bool = conn
            .query_row(
                "SELECT enabled FROM mcp_servers WHERE id = ?1",
                params![server_id],
                |row| row.get::<_, i64>(0).map(|v| v != 0),
            )
            .unwrap_or(false);
        if !server_enabled {
            return Err(format!("MCP server disabled: {server_id}"));
        }
        let project_disabled: Option<i64> = conn
            .query_row(
                "SELECT enabled FROM project_mcp_settings WHERE project_id = ?1 AND server_id = ?2",
                params![project_id, server_id],
                |row| row.get(0),
            )
            .ok();
        if project_disabled == Some(0) {
            return Err(format!("MCP server disabled for this project: {server_id}"));
        }
    }

    check_task_permission(
        db,
        project_id,
        task_id,
        "mcp",
        "call",
        &target,
        &format!("Call MCP tool {target}"),
        "medium",
        true,
        tool_payload,
    )?;

    let _ = push_config_to_helper(&db, None).await?;
    let result = call_mcp_tool_remote(project_id, server_id, tool_name, arguments).await?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id.to_string()),
            task_id: task_id.map(String::from),
            actor: "coordinator".into(),
            category: "mcp".into(),
            action: "call".into(),
            target: Some(target),
            summary: format!(
                "MCP tool {} — {} ({}ms)",
                result.source, if result.ok { "ok" } else { "failed" }, result.duration_ms
            ),
            risk: Some("medium".into()),
            decision: None,
            result: if result.ok {
                "succeeded".into()
            } else {
                "failed".into()
            },
            metadata: Some(serde_json::json!({ "durationMs": result.duration_ms })),
        },
    )?;

    if !result.ok {
        return Err(result.output);
    }
    Ok(result.output.chars().take(10000).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_sensitive_env_for_display() {
        let mut env = serde_json::Map::new();
        env.insert("OPENAI_API_KEY".into(), serde_json::Value::String("sk-test".into()));
        env.insert("NODE_ENV".into(), serde_json::Value::String("production".into()));

        let redacted = redact_env_for_display(env);

        assert_eq!(
            redacted.get("OPENAI_API_KEY").and_then(|v| v.as_str()),
            Some("[REDACTED]")
        );
        assert_eq!(
            redacted.get("NODE_ENV").and_then(|v| v.as_str()),
            Some("production")
        );
    }
}
