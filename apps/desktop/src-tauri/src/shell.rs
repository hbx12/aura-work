use serde::{Deserialize, Serialize};
use std::process::Command;

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
        "pytest" | "python" | "python3" | "node" | "go" | "make" | "cmake" | "dotnet"
        | "mvn" | "gradle" | "tsc" | "vitest" | "jest" => {
            (CommandCategory::BuildTest, "medium")
        }
        "rm" | "del" | "rmdir" | "format" | "mkfs" | "dd" => {
            (CommandCategory::Destructive, "critical")
        }
        "curl" | "wget" | "ssh" | "scp" => (CommandCategory::Unknown, "medium"),
        _ => (CommandCategory::Unknown, "medium"),
    }
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

pub fn always_requires_approval(category: CommandCategory) -> bool {
    matches!(
        category,
        CommandCategory::Install | CommandCategory::Destructive
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

#[tauri::command]
pub fn run_terminal_command(
    cwd: String,
    command: String,
) -> Result<TerminalResult, String> {
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

    Ok(TerminalResult {
        stdout,
        stderr,
        success,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn hard_deny() {
        assert!(is_hard_denied("rm -rf /"));
    }
}
