use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::extensions_helper::{
    call_plugin_tool_remote, ensure_plugins_helper_ready, fetch_marketplace_remote,
    get_plugins_helper_status, start_plugins_helper, stop_plugins_helper, sync_helper_config,
    HelperConfigPayload, InstalledPluginConfig, PluginManifest, PluginsHelperStatus,
};
use crate::permissions::check_task_permission;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPlugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub publisher: Option<String>,
    pub description: Option<String>,
    pub install_path: String,
    pub enabled: bool,
    pub installed_at: String,
    pub tool_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceEntry {
    pub id: String,
    pub name: String,
    pub version: String,
    pub publisher: Option<String>,
    pub description: Option<String>,
    pub homepage: Option<String>,
    pub license: Option<String>,
    pub repository: Option<String>,
    pub tags: Option<Vec<String>>,
    pub synced_at: Option<String>,
}

pub fn init_plugin_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS installed_plugins (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            publisher TEXT,
            description TEXT,
            install_path TEXT NOT NULL,
            manifest_json TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            installed_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS marketplace_cache (
            id TEXT PRIMARY KEY NOT NULL,
            metadata_json TEXT NOT NULL,
            synced_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())
}

fn plugins_root() -> Result<PathBuf, String> {
    let home = dirs_home()?;
    let root = home.join(".aura-os").join("plugins");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root)
}

fn dirs_home() -> Result<PathBuf, String> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .map_err(|_| "Could not resolve home directory".into())
}

fn read_manifest_file(path: &Path) -> Result<PluginManifest, String> {
    let names = ["aura.plugin.json", "plugin.json"];
    for name in names {
        let p = path.join(name);
        if p.exists() {
            let raw = fs::read_to_string(&p).map_err(|e| e.to_string())?;
            let m: PluginManifest = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
            if m.id.is_empty() || m.name.is_empty() || m.version.is_empty() {
                return Err("Invalid plugin manifest: missing id, name, or version".into());
            }
            return Ok(m);
        }
    }
    Err(format!("No plugin manifest in {}", path.display()))
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        let dest = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dest)?;
        } else {
            fs::copy(entry.path(), dest).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_installed_plugins(conn: &Connection) -> Result<Vec<InstalledPlugin>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, version, publisher, description, install_path, manifest_json, enabled, installed_at
             FROM installed_plugins ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let manifest_json: String = row.get(6)?;
            let manifest: PluginManifest =
                serde_json::from_str(&manifest_json).unwrap_or(PluginManifest {
                    schema_version: "1.0".into(),
                    id: row.get(0)?,
                    name: row.get(1)?,
                    version: row.get(2)?,
                    publisher: row.get(3)?,
                    description: row.get(4)?,
                    homepage: None,
                    license: None,
                    tools: vec![],
                });
            Ok(InstalledPlugin {
                id: row.get(0)?,
                name: row.get(1)?,
                version: row.get(2)?,
                publisher: row.get(3)?,
                description: row.get(4)?,
                install_path: row.get(5)?,
                enabled: row.get::<_, i64>(7)? != 0,
                installed_at: row.get(8)?,
                tool_count: manifest.tools.len() as u32,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn build_helper_config(conn: &Connection) -> Result<HelperConfigPayload, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, install_path, manifest_json, enabled FROM installed_plugins WHERE enabled = 1",
        )
        .map_err(|e| e.to_string())?;
    let plugins: Vec<InstalledPluginConfig> = stmt
        .query_map([], |row| {
            let manifest_json: String = row.get(2)?;
            let manifest: PluginManifest = serde_json::from_str(&manifest_json).unwrap_or_else(|_| {
                PluginManifest {
                    schema_version: "1.0".into(),
                    id: row.get(0).unwrap_or_default(),
                    name: "Unknown".into(),
                    version: "0.0.0".into(),
                    publisher: None,
                    description: None,
                    homepage: None,
                    license: None,
                    tools: vec![],
                }
            });
            Ok(InstalledPluginConfig {
                id: row.get(0)?,
                install_path: row.get(1)?,
                enabled: row.get::<_, i64>(3)? != 0,
                manifest,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    let mcp_servers = crate::mcp::load_mcp_server_configs(conn)?;
    let project_mcp_settings = crate::mcp::load_project_mcp_settings(conn)?;

    Ok(HelperConfigPayload {
        plugins,
        mcp_servers,
        project_mcp_settings,
    })
}

pub async fn push_config_to_helper(db: &DbState) -> Result<PluginsHelperStatus, String> {
    let config = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        build_helper_config(&conn)?
    };
    let _ = ensure_plugins_helper_ready().await?;
    sync_helper_config(&config).await
}

#[tauri::command]
pub async fn get_plugins_status() -> Result<PluginsHelperStatus, String> {
    get_plugins_helper_status().await
}

#[tauri::command]
pub async fn start_plugins() -> Result<PluginsHelperStatus, String> {
    start_plugins_helper().await
}

#[tauri::command]
pub async fn stop_plugins() -> Result<PluginsHelperStatus, String> {
    stop_plugins_helper().await
}

#[tauri::command]
pub fn list_installed_plugins(db: State<'_, DbState>) -> Result<Vec<InstalledPlugin>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load_installed_plugins(&conn)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallLocalPluginInput {
    pub source_path: String,
}

#[tauri::command]
pub async fn install_local_plugin(
    db: State<'_, DbState>,
    input: InstallLocalPluginInput,
) -> Result<InstalledPlugin, String> {
    let src = PathBuf::from(&input.source_path);
    if !src.is_dir() {
        return Err("Plugin source must be a directory containing aura.plugin.json".into());
    }
    let manifest = read_manifest_file(&src)?;
    let root = plugins_root()?;
    let dest = root.join(&manifest.id);
    if dest.exists() {
        fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
    }
    copy_dir_all(&src, &dest)?;

    let now = chrono::Utc::now().to_rfc3339();
    let manifest_json = serde_json::to_string(&manifest).map_err(|e| e.to_string())?;
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO installed_plugins (id, name, version, publisher, description, install_path, manifest_json, enabled, installed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, version=excluded.version, publisher=excluded.publisher,
               description=excluded.description, install_path=excluded.install_path,
               manifest_json=excluded.manifest_json, installed_at=excluded.installed_at",
            params![
                manifest.id,
                manifest.name,
                manifest.version,
                manifest.publisher,
                manifest.description,
                dest.to_string_lossy(),
                manifest_json,
                now
            ],
        )
        .map_err(|e| e.to_string())?;

        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: None,
                task_id: None,
                actor: "user".into(),
                category: "plugin".into(),
                action: "install".into(),
                target: Some(manifest.id.clone()),
                summary: format!("Installed plugin {} v{}", manifest.name, manifest.version),
                risk: Some("medium".into()),
                decision: None,
                result: "succeeded".into(),
                metadata: None,
            },
        )?;
    }

    let _ = push_config_to_helper(&db).await;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load_installed_plugins(&conn)?
        .into_iter()
        .find(|p| p.id == manifest.id)
        .ok_or_else(|| "Plugin installed but not found".into())
}

#[tauri::command]
pub async fn uninstall_plugin(db: State<'_, DbState>, plugin_id: String) -> Result<(), String> {
    let install_path = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let path: String = conn
            .query_row(
                "SELECT install_path FROM installed_plugins WHERE id = ?1",
                params![plugin_id],
                |row| row.get(0),
            )
            .map_err(|_| "Plugin not found".to_string())?;
        conn.execute(
            "DELETE FROM installed_plugins WHERE id = ?1",
            params![plugin_id],
        )
        .map_err(|e| e.to_string())?;
        append_audit(
            &conn,
            &AppendAuditInput {
                project_id: None,
                task_id: None,
                actor: "user".into(),
                category: "plugin".into(),
                action: "uninstall".into(),
                target: Some(plugin_id.clone()),
                summary: format!("Uninstalled plugin {plugin_id}"),
                risk: Some("low".into()),
                decision: None,
                result: "succeeded".into(),
                metadata: None,
            },
        )?;
        path
    };
    let p = PathBuf::from(install_path);
    if p.exists() {
        let _ = fs::remove_dir_all(p);
    }
    let _ = push_config_to_helper(&db).await;
    Ok(())
}

#[tauri::command]
pub async fn set_plugin_enabled(
    db: State<'_, DbState>,
    plugin_id: String,
    enabled: bool,
) -> Result<InstalledPlugin, String> {
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE installed_plugins SET enabled = ?1 WHERE id = ?2",
            params![if enabled { 1 } else { 0 }, plugin_id],
        )
        .map_err(|e| e.to_string())?;
    }
    let _ = push_config_to_helper(&db).await;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load_installed_plugins(&conn)?
        .into_iter()
        .find(|p| p.id == plugin_id)
        .ok_or_else(|| "Plugin not found".into())
}

#[tauri::command]
pub async fn sync_marketplace(
    db: State<'_, DbState>,
    registry_url: Option<String>,
) -> Result<Vec<MarketplaceEntry>, String> {
    let data = fetch_marketplace_remote(registry_url.as_deref()).await?;
    let entries: Vec<MarketplaceEntry> = if let Some(arr) = data.get("entries").and_then(|v| v.as_array()) {
        arr.iter()
            .filter_map(|e| {
                let synced_at = data.get("fetchedAt").and_then(|v| v.as_str()).map(String::from);
                Some(MarketplaceEntry {
                    id: e.get("id")?.as_str()?.into(),
                    name: e.get("name")?.as_str()?.into(),
                    version: e.get("version")?.as_str()?.into(),
                    publisher: e.get("publisher").and_then(|v| v.as_str()).map(String::from),
                    description: e.get("description").and_then(|v| v.as_str()).map(String::from),
                    homepage: e.get("homepage").and_then(|v| v.as_str()).map(String::from),
                    license: e.get("license").and_then(|v| v.as_str()).map(String::from),
                    repository: e.get("repository").and_then(|v| v.as_str()).map(String::from),
                    tags: e.get("tags").and_then(|v| v.as_array()).map(|a| {
                        a.iter()
                            .filter_map(|t| t.as_str().map(String::from))
                            .collect()
                    }),
                    synced_at,
                })
            })
            .collect()
    } else {
        vec![]
    };

    let now = chrono::Utc::now().to_rfc3339();
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        for entry in &entries {
            let meta = serde_json::to_string(entry).map_err(|e| e.to_string())?;
            conn.execute(
                "INSERT INTO marketplace_cache (id, metadata_json, synced_at) VALUES (?1, ?2, ?3)
                 ON CONFLICT(id) DO UPDATE SET metadata_json=excluded.metadata_json, synced_at=excluded.synced_at",
                params![entry.id, meta, now],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(entries)
}

#[tauri::command]
pub fn list_marketplace_entries(db: State<'_, DbState>) -> Result<Vec<MarketplaceEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT metadata_json FROM marketplace_cache ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let raw: String = row.get(0)?;
            serde_json::from_str(&raw).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reload_plugins_helper(db: State<'_, DbState>) -> Result<PluginsHelperStatus, String> {
    push_config_to_helper(&db).await
}

/// Plugin tool entry used by the task engine.
pub async fn tool_plugin_call(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    plugin_id: &str,
    tool_id: &str,
    arguments: &serde_json::Value,
    tool_payload: Option<serde_json::Value>,
) -> Result<String, String> {
    let target = format!("{plugin_id}:{tool_id}");

    check_task_permission(
        db,
        project_id,
        task_id,
        "plugin",
        "call",
        &target,
        &format!("Call plugin tool {target}"),
        "medium",
        true,
        tool_payload,
    )?;

    let _ = push_config_to_helper(db).await?;
    let result = call_plugin_tool_remote(project_id, plugin_id, tool_id, arguments).await?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id.to_string()),
            task_id: task_id.map(String::from),
            actor: "coordinator".into(),
            category: "plugin".into(),
            action: "call".into(),
            target: Some(target),
            summary: format!(
                "Plugin tool {} — {} ({}ms)",
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSkillInput {
    pub name: String,
    pub description: String,
    pub prompt: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillInfo {
    pub plugin_id: String,
    pub name: String,
    pub description: String,
    pub prompt: String,
    pub enabled: bool,
}

#[tauri::command]
pub async fn create_local_skill(
    db: State<'_, DbState>,
    input: CreateSkillInput,
) -> Result<InstalledPlugin, String> {
    let slug = input.name.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "-");
    let plugin_id = format!("com.aura.skill.{}", slug);
    let root = plugins_root()?;
    let dest = root.join(&plugin_id);
    if dest.exists() {
        fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    let manifest_json = serde_json::json!({
        "schemaVersion": "1.0",
        "id": plugin_id,
        "name": input.name,
        "version": "1.0.0",
        "publisher": "User",
        "description": input.description,
        "skills": [
            {
                "name": input.name,
                "prompt": input.prompt
            }
        ]
    });

    let manifest_str = serde_json::to_string_pretty(&manifest_json).map_err(|e| e.to_string())?;
    fs::write(dest.join("aura.plugin.json"), &manifest_str).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO installed_plugins (id, name, version, publisher, description, install_path, manifest_json, enabled, installed_at)
             VALUES (?1, ?2, '1.0.0', 'User', ?3, ?4, ?5, 1, ?6)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, description=excluded.description, install_path=excluded.install_path,
               manifest_json=excluded.manifest_json, installed_at=excluded.installed_at",
            params![
                plugin_id,
                input.name,
                input.description,
                dest.to_string_lossy().to_string(),
                manifest_str,
                now
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    let _ = push_config_to_helper(&db).await;

    Ok(InstalledPlugin {
        id: plugin_id,
        name: input.name,
        version: "1.0.0".into(),
        publisher: Some("User".into()),
        description: Some(input.description),
        install_path: dest.to_string_lossy().to_string(),
        enabled: true,
        installed_at: now,
        tool_count: 0,
    })
}

#[tauri::command]
pub fn list_local_skills(db: State<'_, DbState>) -> Result<Vec<SkillInfo>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, manifest_json, enabled FROM installed_plugins")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let manifest_json: String = row.get(1)?;
            let enabled: i64 = row.get(2)?;
            Ok((id, manifest_json, enabled != 0))
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        let (id, json_str, enabled) = row.map_err(|e| e.to_string())?;
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
            if let Some(skills_arr) = val.get("skills").and_then(|s| s.as_array()) {
                for skill in skills_arr {
                    let name = skill.get("name").and_then(|n| n.as_str()).unwrap_or("").to_string();
                    let prompt = skill.get("prompt").and_then(|p| p.as_str()).unwrap_or("").to_string();
                    let description = val.get("description").and_then(|d| d.as_str()).unwrap_or("").to_string();
                    if !name.is_empty() {
                        list.push(SkillInfo {
                            plugin_id: id.clone(),
                            name,
                            description,
                            prompt,
                            enabled,
                        });
                    }
                }
            }
        }
    }
    Ok(list)
}
