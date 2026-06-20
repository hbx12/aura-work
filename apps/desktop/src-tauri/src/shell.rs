use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::files::project_folder;
use crate::permissions::check_task_permission;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::State;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommandCategory {
    SafeRead,
    BuildTest,
    Install,
    Destructive,
    Unknown,
}

impl CommandCategory {
    pub fn as_action(&self) -> &'static str {
        match self {
            Self::SafeRead => "read",
            Self::BuildTest => "build-test",
            Self::Install => "install",
            Self::Destructive => "destructive",
            Self::Unknown => "execute",
        }
    }
}

pub fn categorize_command(command: &str) -> (CommandCategory, &'static str) {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return (CommandCategory::Unknown, "medium");
    }

    let lower = trimmed.to_lowercase();
    if lower.contains("sudo ") || lower.starts_with("sudo") {
        return (CommandCategory::Unknown, "critical");
    }

    if is_hard_denied(trimmed) {
        return (CommandCategory::Destructive, "critical");
    }

    if has_shell_write_operator(&lower) {
        return (CommandCategory::Unknown, "high");
    }

    if has_shell_control_operator(&lower) {
        return (CommandCategory::Unknown, "medium");
    }

    let first = trimmed.split_whitespace().next().unwrap_or("").to_lowercase();

    match first.as_str() {
        "ls" | "pwd" | "echo" | "cat" | "head" | "tail" | "wc" | "file" | "which" | "rg"
        | "grep" | "find" | "stat" | "du" | "tree" => (CommandCategory::SafeRead, "low"),
        "sed" => {
            if lower.contains("-i") {
                (CommandCategory::BuildTest, "medium")
            } else {
                (CommandCategory::SafeRead, "low")
            }
        }
        "git" => categorize_git(&lower),
        "npm" | "pnpm" | "yarn" | "npx" => categorize_pkg_manager(&lower),
        "pip" | "pip3" | "poetry" | "uv" => (CommandCategory::Install, "high"),
        "cargo" => {
            if lower.contains(" add ") || lower.contains(" install") {
                (CommandCategory::Install, "high")
            } else {
                (CommandCategory::BuildTest, "medium")
            }
        }
        "apt" | "apt-get" | "brew" | "yum" | "dnf" | "pacman" => {
            (CommandCategory::Install, "high")
        }
        "python" | "python3" | "py" => {
            if has_inline_code_arg(&lower, &["-c"]) {
                (CommandCategory::Unknown, "high")
            } else {
                (CommandCategory::BuildTest, "medium")
            }
        }
        "node" => {
            if has_inline_code_arg(&lower, &["-e", "--eval", "-p", "--print"]) {
                (CommandCategory::Unknown, "high")
            } else {
                (CommandCategory::BuildTest, "medium")
            }
        }
        "pytest" | "go" | "make" | "cmake" | "dotnet" | "mvn" | "gradle" | "tsc"
        | "vitest" | "jest" => (CommandCategory::BuildTest, "medium"),
        "rm" | "del" | "rmdir" | "format" | "mkfs" | "dd" => {
            (CommandCategory::Destructive, "critical")
        }
        "cp" | "copy" | "mv" | "move" | "mkdir" | "touch" | "tee" | "set-content"
        | "add-content" | "out-file" | "new-item" | "remove-item" => {
            (CommandCategory::Unknown, "high")
        }
        "curl" | "wget" | "ssh" | "scp" => (CommandCategory::Unknown, "medium"),
        _ => (CommandCategory::Unknown, "medium"),
    }
}

fn has_shell_control_operator(lower: &str) -> bool {
    lower.contains("&&") || lower.contains("||") || lower.contains(';') || lower.contains('|')
}

fn has_shell_write_operator(lower: &str) -> bool {
    lower.contains(" >")
        || lower.contains("> ")
        || lower.contains(">>")
        || lower.contains(" 1>")
        || lower.contains(" 2>")
        || lower.contains("| tee")
        || lower.contains(" out-file")
        || lower.contains(" set-content")
        || lower.contains(" add-content")
}

fn categorize_git(lower: &str) -> (CommandCategory, &'static str) {
    if lower.contains(" clean")
        || lower.contains(" reset --hard")
        || lower.contains(" push --force")
        || lower.contains(" push -f")
        || lower.contains(" checkout .")
    {
        return (CommandCategory::Destructive, "critical");
    }
    if lower.contains(" commit") || lower.contains(" add") || lower.contains(" push") {
        return (CommandCategory::BuildTest, "medium");
    }
    if lower.contains(" status") || lower.contains(" diff") || lower.contains(" log") {
        return (CommandCategory::SafeRead, "low");
    }
    (CommandCategory::Unknown, "medium")
}

fn categorize_pkg_manager(lower: &str) -> (CommandCategory, &'static str) {
    if lower.contains(" install") || lower.contains(" add ") || lower.contains(" i ") {
        (CommandCategory::Install, "high")
    } else if lower.contains(" test") || lower.contains(" run build") || lower.contains(" build") {
        (CommandCategory::BuildTest, "medium")
    } else {
        (CommandCategory::Unknown, "medium")
    }
}

fn has_inline_code_arg(lower: &str, flags: &[&str]) -> bool {
    let normalized = lower.replace('"', " ").replace('\'', " ");
    flags.iter().any(|flag| {
        normalized.contains(&format!(" {flag} "))
            || normalized.contains(&format!(" {flag}="))
            || normalized.ends_with(&format!(" {flag}"))
    })
}

pub fn always_requires_approval(category: CommandCategory) -> bool {
    matches!(
        category,
        CommandCategory::Install | CommandCategory::Destructive | CommandCategory::Unknown
    )
}

pub fn needs_mount_write(category: CommandCategory, command: &str) -> bool {
    if matches!(category, CommandCategory::Install | CommandCategory::Destructive) {
        return true;
    }
    let lower = command.to_lowercase();
    lower.contains("npm run build")
        || lower.contains("pnpm build")
        || lower.contains("cargo build")
        || lower.contains(" > ")
        || lower.contains(" >> ")
}

pub fn is_hard_denied(command: &str) -> bool {
    let lower = command.to_lowercase();
    lower.contains("rm -rf /")
        || lower.contains("rm -fr /")
        || lower.contains("rm -rf /*")
        || lower.contains("mkfs.")
        || lower.contains(":(){ :|:& };:")
        || lower.contains("format c:")
        || lower.contains("del /f /s /q c:\\")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

fn terminal_cwd(root: &str, cwd: Option<&str>) -> Result<PathBuf, String> {
    let root_path = PathBuf::from(root);
    let canonical_root = root_path
        .canonicalize()
        .map_err(|e| format!("Project folder not accessible: {e}"))?;
    let requested = cwd
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| canonical_root.clone());
    let candidate = if requested.is_absolute() {
        requested
    } else {
        canonical_root.join(requested)
    };
    let canonical = candidate
        .canonicalize()
        .map_err(|e| format!("Terminal directory not accessible: {e}"))?;
    if !canonical.starts_with(&canonical_root) {
        return Err("Terminal directory must stay inside the project folder.".into());
    }
    if !canonical.is_dir() {
        return Err("Terminal working directory is not a directory.".into());
    }
    Ok(canonical)
}

fn resolve_cd_target(
    root: &str,
    cwd: Option<&str>,
    target: Option<&str>,
) -> Result<PathBuf, String> {
    let current = terminal_cwd(root, cwd)?;
    let canonical_root = PathBuf::from(root)
        .canonicalize()
        .map_err(|e| format!("Project folder not accessible: {e}"))?;
    let raw = target.map(str::trim).filter(|value| !value.is_empty());
    let candidate = match raw {
        None | Some("~") => canonical_root.clone(),
        Some(value) => {
            let requested = Path::new(value);
            if requested.is_absolute() {
                requested.to_path_buf()
            } else {
                current.join(requested)
            }
        }
    };
    let canonical = candidate
        .canonicalize()
        .map_err(|e| format!("Terminal directory not accessible: {e}"))?;
    if !canonical.starts_with(&canonical_root) {
        return Err("Terminal directory must stay inside the project folder.".into());
    }
    if !canonical.is_dir() {
        return Err("Terminal target is not a directory.".into());
    }
    Ok(canonical)
}

#[tauri::command]
pub fn resolve_terminal_cwd(
    db: State<'_, DbState>,
    project_id: String,
    cwd: Option<String>,
    target: Option<String>,
) -> Result<String, String> {
    let root = project_folder(&db, &project_id)?;
    let resolved = resolve_cd_target(&root, cwd.as_deref(), target.as_deref())?;
    Ok(resolved.to_string_lossy().to_string())
}

#[tauri::command]
pub fn run_terminal_command(
    db: State<'_, DbState>,
    project_id: String,
    cwd: Option<String>,
    command: String,
) -> Result<TerminalResult, String> {
    let root = project_folder(&db, &project_id)?;
    let cwd = terminal_cwd(&root, cwd.as_deref())?;
    if is_hard_denied(&command) {
        return Err("Command denied: destructive pattern blocked by policy.".into());
    }
    let (category, risk) = categorize_command(&command);
    let requires_permission = !matches!(
        category,
        CommandCategory::SafeRead | CommandCategory::BuildTest
    );
    let payload = serde_json::json!({
        "command": command.clone(),
        "cwd": cwd.to_string_lossy(),
        "category": category.as_action(),
    });
    if requires_permission {
        check_task_permission(
            &db,
            &project_id,
            None,
            "shell",
            category.as_action(),
            &command,
            &format!("Run terminal command: {command}"),
            risk,
            true,
            Some(payload.clone()),
        )?;
    }

    #[cfg(target_os = "windows")]
    let (shell, arg) = ("cmd", "/C");
    #[cfg(not(target_os = "windows"))]
    let (shell, arg) = ("sh", "-c");

    let output = Command::new(shell)
        .arg(arg)
        .arg(&command)
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("Failed to execute command: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let success = output.status.success();

    if let Ok(conn) = db.0.lock() {
        let _ = append_audit(
            &conn,
            &AppendAuditInput {
                project_id: Some(project_id),
                task_id: None,
                actor: "user".into(),
                category: "shell".into(),
                action: category.as_action().into(),
                target: Some(command),
                summary: format!("Terminal command in {}", cwd.to_string_lossy()),
                risk: Some(risk.into()),
                decision: if requires_permission {
                    Some("allow-once".into())
                } else {
                    None
                },
                result: if success { "succeeded".into() } else { "failed".into() },
                metadata: Some(payload),
            },
        );
    }

    Ok(TerminalResult {
        stdout,
        stderr,
        success,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn safe_read_commands() {
        assert_eq!(categorize_command("ls -la").0, CommandCategory::SafeRead);
        assert_eq!(categorize_command("git status").0, CommandCategory::SafeRead);
    }

    #[test]
    fn install_commands() {
        assert_eq!(categorize_command("npm install lodash").0, CommandCategory::Install);
    }

    #[test]
    fn shell_write_or_chained_commands_require_approval() {
        let redirect = categorize_command("echo changed > src/main.rs");
        assert_eq!(redirect.0, CommandCategory::Unknown);
        assert!(always_requires_approval(redirect.0));

        let chained = categorize_command("cat package.json && npm install");
        assert_eq!(chained.0, CommandCategory::Unknown);
        assert!(always_requires_approval(chained.0));
    }

    #[test]
    fn inline_interpreters_require_approval() {
        let node = categorize_command("node -e \"require('fs').writeFileSync('x','y')\"");
        assert_eq!(node.0, CommandCategory::Unknown);
        assert_eq!(node.1, "high");
        assert!(always_requires_approval(node.0));

        let python = categorize_command("python -c \"open('x','w').write('y')\"");
        assert_eq!(python.0, CommandCategory::Unknown);
        assert_eq!(python.1, "high");
        assert!(always_requires_approval(python.0));
    }

    #[test]
    fn hard_deny() {
        assert!(is_hard_denied("rm -rf /"));
    }

    #[test]
    fn terminal_cwd_rejects_paths_outside_project() {
        let root = test_project_root("terminal-cwd");
        let outside = root.parent().unwrap().to_path_buf();

        let result = terminal_cwd(root.to_str().unwrap(), Some(outside.to_str().unwrap()));

        assert!(result.is_err());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn resolve_cd_target_rejects_parent_escape() {
        let root = test_project_root("terminal-cd");
        fs::create_dir_all(root.join("src")).unwrap();

        let result = resolve_cd_target(root.to_str().unwrap(), Some("src"), Some("../.."));

        assert!(result.is_err());
        let _ = fs::remove_dir_all(root);
    }

    fn test_project_root(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "aura-work-{name}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        root
    }
}
