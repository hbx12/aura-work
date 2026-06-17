use crate::db::DbState;
use crate::files::project_folder;
use regex::Regex;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppReadiness {
    pub desktop_running: bool,
    pub sidecar_healthy: bool,
    pub vm_helper_running: bool,
    pub browser_helper_running: bool,
    pub plugins_helper_running: bool,
    pub vault_configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectReadiness {
    pub git_detected: bool,
    pub profile_configured: bool,
    pub commands_configured: bool,
    pub rules_file_present: bool,
    pub rollback_supported: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityReadiness {
    pub safe_mode_active: bool,
    pub permission_policy: String,
    pub shell_gated: bool,
    pub delete_gated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadinessChecksResult {
    pub app: AppReadiness,
    pub project: ProjectReadiness,
    pub security: SecurityReadiness,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticBundle {
    pub app_version: String,
    pub os_platform: String,
    pub os_arch: String,
    pub sidecar_status: serde_json::Value,
    pub vm_status: serde_json::Value,
    pub browser_status: serde_json::Value,
    pub plugins_status: serde_json::Value,
    pub recent_logs: Vec<String>,
}

use crate::providers::VaultHandle;

#[tauri::command]
pub async fn run_readiness_checks(
    db: State<'_, DbState>,
    vault: State<'_, VaultHandle>,
    project_id: String,
) -> Result<ReadinessChecksResult, String> {
    let sidecar_healthy = match crate::agent::get_sidecar_status().await {
        Ok(val) => val.get("running").and_then(|v| v.as_bool()).unwrap_or(false),
        Err(_) => false,
    };

    let vm_helper_running = match crate::vm::get_vm_status().await {
        Ok(s) => s.running,
        Err(_) => false,
    };

    let browser_helper_running = match crate::browser::get_browser_status().await {
        Ok(s) => s.running,
        Err(_) => false,
    };

    let plugins_helper_running = match crate::plugins::get_plugins_status().await {
        Ok(s) => s.running,
        Err(_) => false,
    };

    let vault_configured = match crate::providers::get_vault_status(vault) {
        Ok(s) => s.get("initialized").and_then(|v| v.as_bool()).unwrap_or(false),
        Err(_) => false,
    };

    let app = AppReadiness {
        desktop_running: true,
        sidecar_healthy,
        vm_helper_running,
        browser_helper_running,
        plugins_helper_running,
        vault_configured,
    };

    let mut git_detected = false;
    let mut profile_configured = false;
    let mut commands_configured = false;
    let mut rules_file_present = false;
    let mut rollback_supported = false;

    if let Ok(root) = project_folder(&db, &project_id) {
        let root_path = std::path::PathBuf::from(&root);
        if root_path.exists() {
            git_detected = root_path.join(".git").exists();
            let rules_files = ["AURA.md", ".aura/rules.md", "AGENTS.md", "CLAUDE.md", "CONTINUE.md", ".cursorrules", ".windsurfrules"];
            for file in &rules_files {
                if root_path.join(file).exists() {
                    rules_file_present = true;
                    break;
                }
            }
        }

        if let Ok(profile) = crate::onboarding::get_project_profile(db.clone(), project_id.clone()).await {
            profile_configured = profile.confidence == "high";
            commands_configured = !profile.commands.is_empty();
        }

        if let Ok(conn) = db.0.lock() {
            let count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM task_snapshots WHERE project_id = ?1",
                params![project_id],
                |r| r.get(0)
            ).unwrap_or(0);
            rollback_supported = count > 0;
        }
    }

    let project = ProjectReadiness {
        git_detected,
        profile_configured,
        commands_configured,
        rules_file_present,
        rollback_supported,
    };

    let mut safe_mode_active = false;
    let mut permission_policy = "ask-first".to_string();
    if let Ok(mode) = crate::files::project_permission_mode(&db, &project_id) {
        permission_policy = mode.clone();
        safe_mode_active = mode == "ask-first" || mode == "read-only";
    }

    let security = SecurityReadiness {
        safe_mode_active,
        permission_policy,
        shell_gated: true,
        delete_gated: true,
    };

    Ok(ReadinessChecksResult {
        app,
        project,
        security,
    })
}

#[tauri::command]
pub async fn get_diagnostic_bundle(
    db: State<'_, DbState>,
) -> Result<DiagnosticBundle, String> {
    let sidecar_status = crate::agent::get_sidecar_status().await.unwrap_or(serde_json::json!({"running": false}));
    let vm_status = match crate::vm::get_vm_status().await {
        Ok(s) => serde_json::to_value(&s).unwrap_or(serde_json::json!({})),
        Err(e) => serde_json::json!({"error": e}),
    };
    let browser_status = match crate::browser::get_browser_status().await {
        Ok(s) => serde_json::to_value(&s).unwrap_or(serde_json::json!({})),
        Err(e) => serde_json::json!({"error": e}),
    };
    let plugins_status = match crate::plugins::get_plugins_status().await {
        Ok(s) => serde_json::to_value(&s).unwrap_or(serde_json::json!({})),
        Err(e) => serde_json::json!({"error": e}),
    };

    let logs = if let Ok(conn) = db.0.lock() {
        let mut stmt = conn.prepare(
            "SELECT actor, category, action, summary, result, created_at FROM audit_log
             ORDER BY created_at DESC LIMIT 50"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            let actor: String = row.get(0)?;
            let cat: String = row.get(1)?;
            let act: String = row.get(2)?;
            let sum: String = row.get(3)?;
            let res: String = row.get(4)?;
            let date: String = row.get(5)?;
            Ok(format!("[{}] {}/{}: {} ({}) by {}", date, cat, act, sum, res, actor))
        }).map_err(|e| e.to_string())?;

        rows.flatten().collect()
    } else {
        Vec::new()
    };

    let redacted_logs = logs.into_iter().map(|l| redact_secrets(&l)).collect();

    Ok(DiagnosticBundle {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os_platform: std::env::consts::OS.to_string(),
        os_arch: std::env::consts::ARCH.to_string(),
        sidecar_status,
        vm_status,
        browser_status,
        plugins_status,
        recent_logs: redacted_logs,
    })
}

fn redact_secrets(input: &str) -> String {
    let mut out = input.to_string();

    let replacements = [
        (
            r"(?i)\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}",
            "$1 [REDACTED]",
        ),
        (
            r#"(?i)\b(api[_-]?key|secret|token|password|authorization|refresh[_-]?token)([\s:=]+)([^,;\s'"`]{8,})"#,
            "$1$2[REDACTED]",
        ),
        (
            r"(?i)\b(sk-(?:proj-)?[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z_]{20,}|github_pat_[0-9A-Za-z_]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|AKIA[0-9A-Z]{16})",
            "[REDACTED_KEY]",
        ),
        (
            r"://[^/\s:@]+:[^/\s@]+@",
            "://[REDACTED]@",
        ),
    ];

    for (pattern, replacement) in replacements {
        if let Ok(re) = Regex::new(pattern) {
            out = re.replace_all(&out, replacement).into_owned();
        }
    }

    out
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityFinding {
    pub severity: String,
    pub file_path: String,
    pub finding: String,
    pub description: String,
    pub recommended_fix: String,
    pub auto_fixable: bool,
}

#[tauri::command]
pub async fn run_security_audit(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<Vec<SecurityFinding>, String> {
    let root = project_folder(&db, &project_id)?;
    let files = crate::files::list_dir_internal(&root, None, 4).unwrap_or_default();
    let mut findings = Vec::new();

    // Check .gitignore for .env
    let root_path = std::path::PathBuf::from(&root);
    let gitignore_path = root_path.join(".gitignore");
    if gitignore_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&gitignore_path) {
            if !content.contains(".env") {
                findings.push(SecurityFinding {
                    severity: "high".into(),
                    file_path: ".gitignore".into(),
                    finding: "Missing .env exclusion".into(),
                    description: ".env files are not excluded in .gitignore, risking public push of credentials.".into(),
                    recommended_fix: "Add '.env' and '.env.*' to your .gitignore file.".into(),
                    auto_fixable: true,
                });
            }
        }
    } else {
        findings.push(SecurityFinding {
            severity: "medium".into(),
            file_path: ".gitignore".into(),
            finding: "Missing .gitignore file".into(),
            description: "No .gitignore file detected in project root.".into(),
            recommended_fix: "Create a .gitignore file to exclude sensitive environment variables and build artifacts.".into(),
            auto_fixable: true,
        });
    }

    // Scan individual source files
    for f in files {
        if f.is_dir || f.path.contains("node_modules") || f.path.contains(".git") || f.path.contains("dist") || f.path.contains("build") {
            continue;
        }

        let content = match crate::files::read_file_internal(&root, &f.path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // 1. Check for API keys
        let sk_patterns = ["sk-proj-", "sk-ant-", "AIzaSy"];
        for pat in &sk_patterns {
            if content.contains(pat) {
                findings.push(SecurityFinding {
                    severity: "critical".into(),
                    file_path: f.path.clone(),
                    finding: "Hardcoded API Key / Secret".into(),
                    description: format!("Found pattern matching '{}' inside file.", pat),
                    recommended_fix: "Move secrets to a .env file and load them via environment variables.".into(),
                    auto_fixable: false,
                });
                break;
            }
        }

        // 2. Check for CORS wildcards
        if (f.path.ends_with(".js") || f.path.ends_with(".ts") || f.path.ends_with(".py") || f.path.ends_with(".rs"))
            && (content.contains("Access-Control-Allow-Origin") && content.contains("*"))
        {
            findings.push(SecurityFinding {
                severity: "medium".into(),
                file_path: f.path.clone(),
                finding: "Permissive CORS Policy (*) detected".into(),
                description: "Using wildcards in CORS policies allows any external domain to make requests to your local server.".into(),
                recommended_fix: "Specify whitelist origins instead of using '*' wildcard.".into(),
                auto_fixable: false,
            });
        }

        // 3. Dangerous API usage
        if (f.path.ends_with(".js") || f.path.ends_with(".ts")) && content.contains("eval(") {
            findings.push(SecurityFinding {
                severity: "high".into(),
                file_path: f.path.clone(),
                finding: "Dangerous eval() usage".into(),
                description: "eval() executes arbitrary JavaScript strings, leading to potential Remote Code Execution vulnerabilities.".into(),
                recommended_fix: "Refactor code to avoid using eval(). Use JSON parsing or direct object mapping.".into(),
                auto_fixable: false,
            });
        }
    }

    Ok(findings)
}
