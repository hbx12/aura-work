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

const MAX_SKILL_EXCHANGE_BYTES: usize = 512 * 1024;

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
            validate_plugin_id(&m.id)?;
            return Ok(m);
        }
    }
    Err(format!("No plugin manifest in {}", path.display()))
}

fn validate_plugin_id(id: &str) -> Result<(), String> {
    let valid = !id.is_empty()
        && id.len() <= 128
        && !id.contains("..")
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'));
    if valid {
        Ok(())
    } else {
        Err("Invalid plugin id: use letters, numbers, dots, dashes, or underscores only".into())
    }
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        let dest = dst.join(entry.file_name());
        if ty.is_symlink() {
            return Err("Plugin source cannot contain symlinks".into());
        } else if ty.is_dir() {
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

    let mut mcp_servers = crate::mcp::load_mcp_server_configs(conn)?;
    let mut project_mcp_settings = crate::mcp::load_project_mcp_settings(conn)?;

    if let Some(app_data) = APP_DATA_DIR.get() {
        let (global_servers, _) = load_aura_config(app_data, "");
        mcp_servers.extend(global_servers);
    }

    let mut stmt = conn.prepare("SELECT id, folder_path FROM projects").map_err(|e| e.to_string())?;
    let projects: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    for (project_id, folder_path) in &projects {
        let (project_servers, project_server_settings) = load_aura_config(Path::new(folder_path), project_id);
        
        for mut s in project_servers {
            s.enabled = project_mcp_settings
                .iter()
                .find(|setting| setting.project_id == *project_id && setting.server_id == s.id)
                .map(|setting| setting.enabled)
                .unwrap_or(false);
            mcp_servers.push(s.clone());
            
            for (other_id, _) in &projects {
                if other_id != project_id {
                    project_mcp_settings.push(crate::extensions_helper::ProjectMcpSetting {
                        project_id: other_id.clone(),
                        server_id: s.id.clone(),
                        enabled: false,
                    });
                }
            }
        }
        project_mcp_settings.extend(project_server_settings);
    }

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
    pub path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSkillInput {
    pub plugin_id: String,
    pub name: String,
    pub description: String,
    pub prompt: String,
    pub path: Option<String>,
}


#[tauri::command]
pub async fn create_local_skill(
    db: State<'_, DbState>,
    input: CreateSkillInput,
) -> Result<InstalledPlugin, String> {
    let slug = input.name.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "-");
    let plugin_id = format!("com.aura.skill.{}", slug);
    validate_plugin_id(&plugin_id)?;
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

fn parse_skill_file(path: &Path) -> Option<SkillInfo> {
    let content = fs::read_to_string(path).ok()?;
    let content_trimmed = content.trim();
    
    let (fm_part, body_part) = if content_trimmed.starts_with("---") {
        let rest = &content_trimmed[3..];
        if let Some(end_fm) = rest.find("---") {
            (&rest[..end_fm], rest[end_fm + 3..].trim().to_string())
        } else {
            ("", content_trimmed.to_string())
        }
    } else {
        ("", content_trimmed.to_string())
    };

    let mut name = String::new();
    let mut description = String::new();

    for line in fm_part.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, val)) = line.split_once(':') {
            let key = key.trim();
            let val = val.trim().trim_matches('"').trim_matches('\'');
            if key == "name" {
                name = val.to_string();
            } else if key == "description" {
                description = val.to_string();
            }
        }
    }

    if name.is_empty() {
        if let Some(parent) = path.parent() {
            if let Some(folder_name) = parent.file_name() {
                name = folder_name.to_string_lossy().to_string();
            }
        }
    }

    if name.is_empty() {
        return None;
    }

    Some(SkillInfo {
        plugin_id: "config_skill".to_string(),
        name,
        description,
        prompt: body_part,
        enabled: true,
        path: Some(path.to_string_lossy().to_string()),
    })
}

fn scan_skills_in_dir(dir: &Path, list: &mut Vec<SkillInfo>) {
    if !dir.is_dir() {
        return;
    }
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let skill_md_path = path.join("SKILL.md");
                if skill_md_path.is_file() {
                    if let Some(skill_info) = parse_skill_file(&skill_md_path) {
                        if !list.iter().any(|s| s.name == skill_info.name) {
                            list.push(skill_info);
                        }
                    }
                }
            }
        }
    }
}

pub fn list_local_skills_internal(db: &DbState) -> Result<Vec<SkillInfo>, String> {
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
                            path: None,
                        });
                    }
                }
            }
        }
    }

    // 1. Scan global directories
    if let Ok(home) = dirs_home() {
        let global_paths = [
            home.join(".config").join("aura").join("skills"),
            home.join(".agents").join("skills"),
            home.join(".claude").join("skills"),
            home.join(".aura").join("skills"),
        ];
        for path in &global_paths {
            scan_skills_in_dir(path, &mut list);
        }
    }

    // 2. Scan project-specific directories
    let mut stmt_proj = conn.prepare("SELECT folder_path FROM projects").map_err(|e| e.to_string())?;
    let project_paths: Vec<String> = stmt_proj
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    for folder in project_paths {
        let project_dir = Path::new(&folder);
        let project_paths = [
            project_dir.join(".aura").join("skills"),
            project_dir.join(".agents").join("skills"),
            project_dir.join(".claude").join("skills"),
        ];
        for path in &project_paths {
            scan_skills_in_dir(path, &mut list);
        }
    }

    Ok(list)
}

#[tauri::command]
pub fn list_local_skills(db: State<'_, DbState>) -> Result<Vec<SkillInfo>, String> {
    list_local_skills_internal(&db)
}

#[tauri::command]
pub async fn save_local_skill(
    db: State<'_, DbState>,
    input: SaveSkillInput,
) -> Result<(), String> {
    if input.plugin_id == "config_skill" {
        // Write to SKILL.md
        let file_path = input.path.ok_or_else(|| "Missing file path for config skill".to_string())?;
        let path = Path::new(&file_path);
        if !path.is_file() {
            return Err("Skill file does not exist".to_string());
        }
        validate_config_skill_path(&db, path)?;
        
        let new_content = format!(
            "---\nname: {}\ndescription: {}\n---\n{}",
            input.name, input.description, input.prompt
        );
        fs::write(path, new_content).map_err(|e| format!("Failed to write skill file: {}", e))?;
    } else {
        // It's a database / plugin skill
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        
        // Fetch the existing installed plugin info to verify and update
        let mut stmt = conn
            .prepare("SELECT install_path FROM installed_plugins WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let install_path: String = stmt
            .query_row(params![input.plugin_id], |row| row.get(0))
            .map_err(|e| format!("Skill not found in database: {}", e))?;
            
        let manifest_json = serde_json::json!({
            "schemaVersion": "1.0",
            "id": input.plugin_id,
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
        
        // Write to manifest file
        let dest = Path::new(&install_path);
        if dest.exists() {
            fs::write(dest.join("aura.plugin.json"), &manifest_str).map_err(|e| format!("Failed to write manifest: {}", e))?;
        }
        
        // Update database
        conn.execute(
            "UPDATE installed_plugins SET name = ?1, description = ?2, manifest_json = ?3 WHERE id = ?4",
            params![input.name, input.description, manifest_str, input.plugin_id],
        ).map_err(|e| format!("Failed to update database: {}", e))?;
    }
    
    let _ = push_config_to_helper(&db).await;
    Ok(())
}

pub static APP_DATA_DIR: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

#[derive(Debug, Clone, Deserialize)]
struct AuraConfigFile {
    mcp: Option<std::collections::HashMap<String, AuraConfigMcpEntry>>,
}

#[derive(Debug, Clone, Deserialize)]
struct AuraConfigMcpEntry {
    #[serde(rename = "type")]
    entry_type: String, // "local" or "remote"
    command: Option<serde_json::Value>, // can be array or string
    url: Option<String>,
    enabled: Option<bool>,
    environment: Option<std::collections::HashMap<String, serde_json::Value>>,
    headers: Option<std::collections::HashMap<String, String>>,
    timeout: Option<i64>,
}

fn strip_jsonc_comments(jsonc: &str) -> String {
    let mut clean = String::new();
    let mut in_line_comment = false;
    let mut in_block_comment = false;
    let mut in_string = false;
    let mut chars = jsonc.chars().peekable();

    while let Some(c) = chars.next() {
        if in_line_comment {
            if c == '\n' || c == '\r' {
                in_line_comment = false;
                clean.push(c);
            }
        } else if in_block_comment {
            if c == '*' && chars.peek() == Some(&'/') {
                chars.next(); // consume '/'
                in_block_comment = false;
            }
        } else if in_string {
            if c == '"' {
                in_string = false;
            } else if c == '\\' {
                if let Some(escaped) = chars.next() {
                    clean.push(c);
                    clean.push(escaped);
                    continue;
                }
            }
            clean.push(c);
        } else {
            if c == '/' && chars.peek() == Some(&'/') {
                chars.next();
                in_line_comment = true;
            } else if c == '/' && chars.peek() == Some(&'*') {
                chars.next();
                in_block_comment = true;
            } else {
                if c == '"' {
                    in_string = true;
                }
                clean.push(c);
            }
        }
    }
    clean
}

fn expand_env_vars(val: &str) -> String {
    let mut result = val.to_string();
    while let Some(start_idx) = result.find("{env:") {
        if let Some(end_offset) = result[start_idx..].find('}') {
            let end_idx = start_idx + end_offset;
            let var_name = &result[start_idx + 5..end_idx];
            let var_value = std::env::var(var_name).unwrap_or_default();
            result.replace_range(start_idx..end_idx + 1, &var_value);
        } else {
            break;
        }
    }
    result
}

fn expand_json_value_env_vars(val: &serde_json::Value) -> serde_json::Value {
    match val {
        serde_json::Value::String(s) => {
            serde_json::Value::String(expand_env_vars(s))
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(
                arr.iter().map(expand_json_value_env_vars).collect()
            )
        }
        serde_json::Value::Object(obj) => {
            let mut new_obj = serde_json::Map::new();
            for (k, v) in obj {
                new_obj.insert(k.clone(), expand_json_value_env_vars(v));
            }
            serde_json::Value::Object(new_obj)
        }
        _ => val.clone(),
    }
}

pub fn load_aura_config(
    dir: &Path,
    prefix_id: &str,
) -> (Vec<crate::extensions_helper::McpServerConfig>, Vec<crate::extensions_helper::ProjectMcpSetting>) {
    let aura_json = dir.join("aura.json");
    let aura_jsonc = dir.join("aura.jsonc");
    let path = if aura_json.exists() {
        Some(aura_json)
    } else if aura_jsonc.exists() {
        Some(aura_jsonc)
    } else {
        None
    };

    let mut mcp_servers = Vec::new();
    let mut project_settings = Vec::new();

    if let Some(p) = path {
        if let Ok(content) = fs::read_to_string(p) {
            let clean = strip_jsonc_comments(&content);
            if let Ok(config) = serde_json::from_str::<AuraConfigFile>(&clean) {
                if let Some(mcp) = config.mcp {
                    for (name, entry) in mcp {
                        let enabled = entry.enabled.unwrap_or(prefix_id.is_empty());
                        let mut command = String::new();
                        let mut args = Vec::new();
                        let mut transport = "stdio".to_string();

                        if entry.entry_type == "remote" {
                            if let Some(ref u) = entry.url {
                                let expanded_url = expand_env_vars(u);
                                command = expanded_url;
                                if command.starts_with("ws://") || command.starts_with("wss://") {
                                    transport = "websocket".to_string();
                                } else {
                                    transport = "sse".to_string();
                                }
                            }
                        } else {
                            if let Some(ref cmd_val) = entry.command {
                                let expanded_val = expand_json_value_env_vars(cmd_val);
                                if let Some(arr) = expanded_val.as_array() {
                                    if !arr.is_empty() {
                                        command = arr[0].as_str().unwrap_or("").to_string();
                                        for v in &arr[1..] {
                                            args.push(v.as_str().unwrap_or("").to_string());
                                        }
                                    }
                                } else if let Some(s) = expanded_val.as_str() {
                                    command = s.to_string();
                                }
                            }
                        }

                        if !command.is_empty() {
                            let server_id = if prefix_id.is_empty() {
                                format!("aura_config_global_{name}")
                            } else {
                                format!("aura_config_project_{prefix_id}_{name}")
                            };

                            let mut env_map = serde_json::Map::new();
                            if let Some(environment) = entry.environment {
                                for (k, v) in environment {
                                    env_map.insert(k, expand_json_value_env_vars(&v));
                                }
                            }

                            let mut headers_map = std::collections::HashMap::new();
                            if let Some(headers) = entry.headers {
                                for (k, v) in headers {
                                    headers_map.insert(k, expand_env_vars(&v));
                                }
                            }

                            mcp_servers.push(crate::extensions_helper::McpServerConfig {
                                id: server_id.clone(),
                                name: name.clone(),
                                transport,
                                command,
                                args,
                                env: env_map,
                                enabled,
                                headers: if headers_map.is_empty() { None } else { Some(headers_map) },
                                timeout: entry.timeout,
                            });

                            if !prefix_id.is_empty() {
                                project_settings.push(crate::extensions_helper::ProjectMcpSetting {
                                    project_id: prefix_id.to_string(),
                                    server_id,
                                    enabled,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    (mcp_servers, project_settings)
}

#[tauri::command]
pub fn save_text_file(path: String, content: String) -> Result<(), String> {
    validate_skill_exchange_file(&path, false)?;
    if content.len() > MAX_SKILL_EXCHANGE_BYTES {
        return Err("Skill export is too large.".into());
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    validate_skill_exchange_file(&path, true)?;
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

fn validate_skill_exchange_file(path: &str, must_exist: bool) -> Result<(), String> {
    let path = Path::new(path);
    let ext = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if ext != "aura-skill" && ext != "json" {
        return Err("Only .aura-skill and .json skill files are supported.".into());
    }
    if must_exist {
        let meta = fs::metadata(path).map_err(|e| e.to_string())?;
        if !meta.is_file() {
            return Err("Selected path is not a file.".into());
        }
        if meta.len() > MAX_SKILL_EXCHANGE_BYTES as u64 {
            return Err("Skill file is too large.".into());
        }
    } else if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err("Target folder does not exist.".into());
        }
    }
    Ok(())
}

fn validate_config_skill_path(db: &DbState, path: &Path) -> Result<(), String> {
    if path.file_name().and_then(|name| name.to_str()) != Some("SKILL.md") {
        return Err("Config skill edits are limited to SKILL.md files.".into());
    }
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Skill file not accessible: {e}"))?;
    let allowed = list_local_skills_internal(db)?
        .into_iter()
        .filter(|skill| skill.plugin_id == "config_skill")
        .filter_map(|skill| skill.path)
        .filter_map(|skill_path| PathBuf::from(skill_path).canonicalize().ok())
        .any(|skill_path| skill_path == canonical);
    if !allowed {
        return Err("Skill file is outside trusted skill directories.".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_load_aura_config_jsonc() {
        let temp_dir = std::env::temp_dir().join(format!("aura-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        let config_content = r#"
        {
            // This is a test JSONC file with comments
            "mcp": {
                "test-mcp-local": {
                    "type": "local",
                    "command": ["npx", "-y", "@modelcontextprotocol/server-everything"],
                    "enabled": true,
                    "environment": {
                        "TEST_VAR": "test_val"
                    }
                },
                /* Block comment test */
                "test-mcp-remote": {
                    "type": "remote",
                    "url": "https://mcp.sentry.dev/mcp",
                    "enabled": false,
                    "headers": {
                        "Authorization": "Bearer {env:TEST_SECRET_VAR}"
                    }
                }
            }
        }
        "#;

        fs::write(temp_dir.join("aura.jsonc"), config_content).unwrap();
        std::env::set_var("TEST_SECRET_VAR", "my-secret-key");

        let (servers, settings) = load_aura_config(&temp_dir, "proj123");

        assert_eq!(servers.len(), 2);

        let local = servers.iter().find(|s| s.name == "test-mcp-local").unwrap();
        assert_eq!(local.id, "aura_config_project_proj123_test-mcp-local");
        assert_eq!(local.transport, "stdio");
        assert_eq!(local.command, "npx");
        assert_eq!(local.args, vec!["-y", "@modelcontextprotocol/server-everything"]);
        assert_eq!(local.env.get("TEST_VAR").unwrap().as_str().unwrap(), "test_val");
        assert!(local.enabled);

        let remote = servers.iter().find(|s| s.name == "test-mcp-remote").unwrap();
        assert_eq!(remote.id, "aura_config_project_proj123_test-mcp-remote");
        assert_eq!(remote.transport, "sse");
        assert_eq!(remote.command, "https://mcp.sentry.dev/mcp");
        assert!(!remote.enabled);
        assert_eq!(remote.headers.as_ref().unwrap().get("Authorization").unwrap(), "Bearer my-secret-key");

        assert_eq!(settings.len(), 2);
        let local_setting = settings.iter().find(|s| s.server_id == "aura_config_project_proj123_test-mcp-local").unwrap();
        assert_eq!(local_setting.project_id, "proj123");
        assert!(local_setting.enabled);

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_parse_skill_file() {
        let temp_dir = std::env::temp_dir().join(format!("aura-skill-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();
        
        let skill_dir = temp_dir.join("test-skill");
        fs::create_dir_all(&skill_dir).unwrap();

        let skill_content = r#"---
name: test-skill
description: A dummy test skill
---
This is the prompt content.
"#;
        let skill_file = skill_dir.join("SKILL.md");
        fs::write(&skill_file, skill_content).unwrap();

        let skill_info = parse_skill_file(&skill_file).unwrap();
        assert_eq!(skill_info.name, "test-skill");
        assert_eq!(skill_info.description, "A dummy test skill");
        assert_eq!(skill_info.prompt, "This is the prompt content.");

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_list_local_skills_internal() {
        use std::sync::{Arc, Mutex};
        use crate::db::DbState;

        let temp_dir = std::env::temp_dir().join(format!("aura-skills-db-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        // Create a test project skills folder
        let proj_dir = temp_dir.join("my-project");
        let skills_dir = proj_dir.join(".agents").join("skills").join("hello-skill");
        fs::create_dir_all(&skills_dir).unwrap();

        let skill_content = r#"---
name: hello-skill
description: A friendly greeting skill
---
Say hello!
"#;
        fs::write(skills_dir.join("SKILL.md"), skill_content).unwrap();

        // Setup mock db
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                folder_path TEXT NOT NULL UNIQUE,
                instructions TEXT,
                permission_mode TEXT NOT NULL DEFAULT 'act-without-asking',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
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
            "
        ).unwrap();

        // Insert project
        conn.execute(
            "INSERT INTO projects (id, name, folder_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params!["proj123", "Test Project", proj_dir.to_str().unwrap(), "2026-01-01", "2026-01-01"]
        ).unwrap();

        let db = DbState(Arc::new(Mutex::new(conn)));
        let list = list_local_skills_internal(&db).unwrap();

        assert!(!list.is_empty());
        let found = list.iter().find(|s| s.name == "hello-skill").unwrap();
        assert_eq!(found.description, "A friendly greeting skill");
        assert_eq!(found.prompt, "Say hello!");

        let _ = fs::remove_dir_all(temp_dir);
    }
}

