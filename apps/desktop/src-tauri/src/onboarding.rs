use crate::db::DbState;
use crate::files::project_folder;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectProfile {
    pub project_id: String,
    pub framework: Option<String>,
    pub language: Option<String>,
    pub package_manager: Option<String>,
    pub commands: HashMap<String, String>,
    pub status: HashMap<String, String>,
    pub confidence: String,
    pub git_status: String,
    pub readme_exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandTestResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
    pub exit_code: Option<i32>,
}

#[tauri::command]
pub async fn detect_project_profile(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<ProjectProfile, String> {
    let root = project_folder(&db, &project_id)?;
    let mut framework = None;
    let mut language = None;
    let mut package_manager = None;
    let mut commands = HashMap::new();
    let mut status = HashMap::new();
    let mut confidence = "low".to_string();
    let mut git_status = "not_available".to_string();
    let mut readme_exists = false;

    let root_path = std::path::PathBuf::from(&root);
    if !root_path.exists() {
        return Err("Project folder does not exist.".into());
    }

    if let Ok(entries) = fs::read_dir(&root_path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string().to_lowercase();
            if name.starts_with("readme.md") || name.starts_with("readme") {
                readme_exists = true;
                break;
            }
        }
    }

    let git_dir = root_path.join(".git");
    if git_dir.exists() && git_dir.is_dir() {
        git_status = "detected".to_string();
    }

    let pkg_json_path = root_path.join("package.json");
    if pkg_json_path.exists() && pkg_json_path.is_file() {
        if let Ok(content) = fs::read_to_string(&pkg_json_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                let deps = json.get("dependencies").or(json.get("devDependencies"));
                if let Some(deps_val) = deps {
                    if deps_val.get("next").is_some() {
                        framework = Some("Next.js".to_string());
                    } else if deps_val.get("vite").is_some() {
                        framework = Some("Vite/React".to_string());
                    } else if deps_val.get("tauri").is_some() || deps_val.get("@tauri-apps/api").is_some() {
                        framework = Some("Tauri".to_string());
                    } else if deps_val.get("react").is_some() {
                        framework = Some("React".to_string());
                    } else if deps_val.get("vue").is_some() {
                        framework = Some("Vue".to_string());
                    }
                }

                if root_path.join("tsconfig.json").exists() {
                    language = Some("TypeScript".to_string());
                } else {
                    language = Some("JavaScript".to_string());
                }

                if root_path.join("package-lock.json").exists() {
                    package_manager = Some("npm".to_string());
                } else if root_path.join("yarn.lock").exists() {
                    package_manager = Some("yarn".to_string());
                } else if root_path.join("pnpm-lock.yaml").exists() {
                    package_manager = Some("pnpm".to_string());
                } else if root_path.join("bun.lockb").exists() || root_path.join("bun.lock").exists() {
                    package_manager = Some("bun".to_string());
                } else {
                    package_manager = Some("npm".to_string());
                }

                confidence = "high".to_string();
            }
        }
    }

    let cargo_toml_path = root_path.join("Cargo.toml");
    if cargo_toml_path.exists() && cargo_toml_path.is_file() {
        framework = Some("Rust/Cargo".to_string());
        language = Some("Rust".to_string());
        package_manager = Some("cargo".to_string());
        confidence = "high".to_string();
    }

    let pyproject_toml_path = root_path.join("pyproject.toml");
    let requirements_txt_path = root_path.join("requirements.txt");
    if requirements_txt_path.exists() || pyproject_toml_path.exists() {
        framework = Some("Python".to_string());
        language = Some("Python".to_string());
        package_manager = Some("pip".to_string());
        confidence = "high".to_string();
    }

    let pm = package_manager.clone().unwrap_or_else(|| "npm".to_string());
    if pm == "cargo" {
        commands.insert("install".to_string(), "cargo build".to_string());
        commands.insert("dev".to_string(), "cargo run".to_string());
        commands.insert("build".to_string(), "cargo build --release".to_string());
        commands.insert("test".to_string(), "cargo test".to_string());
        commands.insert("lint".to_string(), "cargo clippy".to_string());
        commands.insert("typecheck".to_string(), "cargo check".to_string());
        commands.insert("format".to_string(), "cargo fmt".to_string());
    } else if pm == "pip" {
        commands.insert("install".to_string(), "pip install -r requirements.txt".to_string());
        commands.insert("dev".to_string(), "python main.py".to_string());
        commands.insert("build".to_string(), "python -m build".to_string());
        commands.insert("test".to_string(), "pytest".to_string());
        commands.insert("lint".to_string(), "flake8".to_string());
        commands.insert("typecheck".to_string(), "mypy .".to_string());
        commands.insert("format".to_string(), "black .".to_string());
    } else {
        let run_cmd = if pm == "npm" { "npm run" } else if pm == "yarn" { "yarn" } else { &format!("{} run", pm) };
        commands.insert("install".to_string(), format!("{} install", pm));
        commands.insert("dev".to_string(), format!("{} dev", run_cmd));
        commands.insert("build".to_string(), format!("{} build", run_cmd));
        commands.insert("test".to_string(), format!("{} test", run_cmd));
        commands.insert("lint".to_string(), format!("{} lint", run_cmd));
        commands.insert("typecheck".to_string(), format!("{} typecheck", run_cmd));
        commands.insert("format".to_string(), format!("{} format", run_cmd));
    }

    for k in commands.keys() {
        status.insert(k.clone(), "detected".to_string());
    }

    Ok(ProjectProfile {
        project_id,
        framework,
        language,
        package_manager,
        commands,
        status,
        confidence,
        git_status,
        readme_exists,
    })
}

#[tauri::command]
pub async fn get_project_profile(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<ProjectProfile, String> {
    let row: Option<(
        Option<String>,
        Option<String>,
        Option<String>,
        String,
        String,
        String,
        String,
        i64,
    )> = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT framework, language, package_manager, commands_json, status_json, confidence, git_status, readme_exists
             FROM project_profiles WHERE project_id = ?1",
            params![project_id],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get(5)?,
                    r.get(6)?,
                    r.get(7)?,
                ))
            },
        )
        .ok()
    };

    if let Some((fw, lang, pm, cmds_json, stat_json, conf, git_stat, readme_ex)) = row {
        let commands = serde_json::from_str(&cmds_json).unwrap_or_default();
        let status = serde_json::from_str(&stat_json).unwrap_or_default();
        Ok(ProjectProfile {
            project_id,
            framework: fw,
            language: lang,
            package_manager: pm,
            commands,
            status,
            confidence: conf,
            git_status: git_stat,
            readme_exists: readme_ex != 0,
        })
    } else {
        // Fallback to auto-detection
        let profile = detect_project_profile(db.clone(), project_id.clone()).await?;
        // Auto-save the detected profile
        let conn2 = db.0.lock().map_err(|e| e.to_string())?;
        let cmds_json = serde_json::to_string(&profile.commands).unwrap_or_default();
        let stat_json = serde_json::to_string(&profile.status).unwrap_or_default();
        let now = chrono::Utc::now().to_rfc3339();
        let _ = conn2.execute(
            "INSERT INTO project_profiles (project_id, framework, language, package_manager, commands_json, status_json, confidence, git_status, readme_exists, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                project_id,
                profile.framework,
                profile.language,
                profile.package_manager,
                cmds_json,
                stat_json,
                profile.confidence,
                profile.git_status,
                if profile.readme_exists { 1 } else { 0 },
                now
            ],
        );
        Ok(profile)
    }
}

#[tauri::command]
pub async fn save_project_profile(
    db: State<'_, DbState>,
    profile: ProjectProfile,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let cmds_json = serde_json::to_string(&profile.commands).map_err(|e| e.to_string())?;
    let stat_json = serde_json::to_string(&profile.status).map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO project_profiles (project_id, framework, language, package_manager, commands_json, status_json, confidence, git_status, readme_exists, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(project_id) DO UPDATE SET
            framework = excluded.framework,
            language = excluded.language,
            package_manager = excluded.package_manager,
            commands_json = excluded.commands_json,
            status_json = excluded.status_json,
            confidence = excluded.confidence,
            git_status = excluded.git_status,
            readme_exists = excluded.readme_exists,
            updated_at = excluded.updated_at",
        params![
            profile.project_id,
            profile.framework,
            profile.language,
            profile.package_manager,
            cmds_json,
            stat_json,
            profile.confidence,
            profile.git_status,
            if profile.readme_exists { 1 } else { 0 },
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn test_project_command(
    db: State<'_, DbState>,
    project_id: String,
    command_str: String,
) -> Result<CommandTestResult, String> {
    let root = project_folder(&db, &project_id)?;
    let root_path = std::path::PathBuf::from(&root);

    #[cfg(target_os = "windows")]
    let (shell, arg) = ("cmd", "/C");
    #[cfg(not(target_os = "windows"))]
    let (shell, arg) = ("sh", "-c");

    let child = Command::new(shell)
        .arg(arg)
        .arg(&command_str)
        .current_dir(&root_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    match child {
        Ok(mut child) => {
            let started = Instant::now();
            loop {
                match child.try_wait() {
                    Ok(Some(_)) => {
                        let out = child.wait_with_output().map_err(|e| e.to_string())?;
                        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                        let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                        let success = out.status.success();
                        let exit_code = out.status.code();

                        return Ok(CommandTestResult {
                            stdout,
                            stderr,
                            success,
                            exit_code,
                        });
                    }
                    Ok(None) if started.elapsed() >= Duration::from_secs(30) => {
                        let _ = child.kill();
                        let out = child.wait_with_output().map_err(|e| e.to_string())?;
                        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                        let mut stderr = String::from_utf8_lossy(&out.stderr).to_string();
                        if !stderr.is_empty() {
                            stderr.push('\n');
                        }
                        stderr.push_str("Command timed out after 30 seconds.");

                        return Ok(CommandTestResult {
                            stdout,
                            stderr,
                            success: false,
                            exit_code: out.status.code(),
                        });
                    }
                    Ok(None) => thread::sleep(Duration::from_millis(100)),
                    Err(e) => {
                        return Ok(CommandTestResult {
                            stdout: "".to_string(),
                            stderr: e.to_string(),
                            success: false,
                            exit_code: None,
                        });
                    }
                }
            }
        }
        Err(e) => Ok(CommandTestResult {
            stdout: "".to_string(),
            stderr: e.to_string(),
            success: false,
            exit_code: None,
        }),
    }
}
