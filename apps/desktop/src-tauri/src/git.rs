use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::files::project_folder;
use crate::permissions::check_or_request;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatusResult {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub clean: bool,
    pub files: Vec<GitFileStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDiffResult {
    pub path: Option<String>,
    pub diff: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingCommit {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub message: String,
    pub diff: String,
    pub status: String,
    pub created_at: String,
}

pub fn init_git_tables(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pending_commits (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            task_id TEXT,
            message TEXT NOT NULL,
            diff TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())
}

fn git_cmd(cwd: &str, args: &[&str]) -> Result<String, String> {
    let git_path = "git".to_string();
    #[cfg(target_os = "macos")]
    let git_path = {
        let mut path = git_path;
        if Command::new("git").arg("--version").output().is_err() {
            if std::path::Path::new("/opt/homebrew/bin/git").exists() {
                path = "/opt/homebrew/bin/git".to_string();
            } else if std::path::Path::new("/usr/local/bin/git").exists() {
                path = "/usr/local/bin/git".to_string();
            }
        }
        path
    };

    let output = Command::new(&git_path)
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Git not available (using command '{}'): {e}", git_path))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(err.trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub fn is_git_repo(root: &str) -> bool {
    let path = std::path::Path::new(root);
    path.join(".git").exists()
}

#[tauri::command]
pub fn git_status(db: State<'_, DbState>, project_id: String) -> Result<GitStatusResult, String> {
    git_status_inner(&db, &project_id)
}

#[tauri::command]
pub fn git_init(db: State<'_, DbState>, project_id: String) -> Result<GitStatusResult, String> {
    let root = project_folder(&db, &project_id)?;
    if !is_git_repo(&root) {
        git_cmd(&root, &["init"])?;
    }
    git_status_inner(&db, &project_id)
}

pub fn git_status_inner(db: &DbState, project_id: &str) -> Result<GitStatusResult, String> {
    let root = project_folder(db, project_id)?;
    if !is_git_repo(&root) {
        return Ok(GitStatusResult {
            is_repo: false,
            branch: None,
            clean: true,
            files: vec![],
        });
    }
    let branch = git_cmd(&root, &["branch", "--show-current"]).ok();
    let porcelain = git_cmd(&root, &["status", "--porcelain"])?;
    
    let prefix = git_cmd(&root, &["rev-parse", "--show-prefix"]).unwrap_or_default();
    let prefix = prefix.trim().replace('\\', "/");

    let mut files = Vec::new();
    for line in porcelain.lines() {
        if line.len() < 4 {
            continue;
        }
        let code = line[..2].trim();
        let mut path = line[3..].trim().to_string().replace('\\', "/");
        
        if !prefix.is_empty() {
            if path.starts_with(&prefix) {
                path = path[prefix.len()..].to_string();
            } else {
                continue;
            }
        }

        let status = match code {
            "M" | "MM" => "modified",
            "A" | "AM" => "added",
            "D" => "deleted",
            "??" => "untracked",
            _ => "changed",
        };
        files.push(GitFileStatus {
            path,
            status: status.into(),
        });
    }
    Ok(GitStatusResult {
        is_repo: true,
        branch,
        clean: files.is_empty(),
        files,
    })
}

#[tauri::command]
pub fn git_diff(
    db: State<'_, DbState>,
    project_id: String,
    file_path: Option<String>,
) -> Result<GitDiffResult, String> {
    git_diff_inner(&db, &project_id, file_path.as_deref())
}

pub fn git_diff_inner(
    db: &DbState,
    project_id: &str,
    file_path: Option<&str>,
) -> Result<GitDiffResult, String> {
    let root = project_folder(db, project_id)?;
    if !is_git_repo(&root) {
        return Err("Not a Git repository.".into());
    }
    let diff = if let Some(ref fp) = file_path {
        let is_untracked = if let Ok(status) = git_cmd(&root, &["status", "--porcelain", fp]) {
            status.starts_with("??")
        } else {
            false
        };

        if is_untracked {
            let full_path = std::path::Path::new(&root).join(fp);
            if let Ok(content) = std::fs::read_to_string(&full_path) {
                let mut fake_diff = format!("--- /dev/null\n+++ b/{}\n@@ -0,0 +1,{} @@\n", fp, content.lines().count());
                for line in content.lines() {
                    fake_diff.push_str(&format!("+{}\n", line));
                }
                fake_diff
            } else {
                git_cmd(&root, &["diff", "--relative", "--", fp])?
            }
        } else {
            git_cmd(&root, &["diff", "--relative", "--", fp])?
        }
    } else {
        git_cmd(&root, &["diff", "--relative"])?
    };
    Ok(GitDiffResult {
        path: file_path.map(String::from),
        diff,
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposeCommitInput {
    pub project_id: String,
    pub task_id: Option<String>,
    pub message: String,
}

#[tauri::command]
pub fn propose_git_commit(
    db: State<'_, DbState>,
    input: ProposeCommitInput,
) -> Result<PendingCommit, String> {
    let root = project_folder(&db, &input.project_id)?;
    if !is_git_repo(&root) {
        return Err("Not a Git repository.".into());
    }
    if input.message.trim().is_empty() {
        return Err("Commit message is required.".into());
    }
    // Stage all changes (both modified and untracked) so they show up in diff
    let _ = git_cmd(&root, &["add", "-A"]);
    let diff = git_cmd(&root, &["diff", "--staged"])?;
    if diff.is_empty() {
        return Err("No changes to commit.".into());
    }

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO pending_commits (id, project_id, task_id, message, diff, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)",
        params![
            id,
            input.project_id,
            input.task_id,
            input.message.trim(),
            diff,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(input.project_id.clone()),
            task_id: input.task_id.clone(),
            actor: "coordinator".into(),
            category: "git".into(),
            action: "commit_proposed".into(),
            target: None,
            summary: format!("Proposed commit: {}", input.message.trim()),
            risk: Some("medium".into()),
            decision: None,
            result: "requested".into(),
            metadata: None,
        },
    )?;

    Ok(PendingCommit {
        id,
        project_id: input.project_id,
        task_id: input.task_id,
        message: input.message.trim().to_string(),
        diff,
        status: "pending".into(),
        created_at: now,
    })
}

#[tauri::command]
pub fn approve_git_commit(db: State<'_, DbState>, commit_id: String) -> Result<PendingCommit, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let pending: PendingCommit = conn
        .query_row(
            "SELECT id, project_id, task_id, message, diff, status, created_at
             FROM pending_commits WHERE id = ?1",
            params![commit_id],
            |row| {
                Ok(PendingCommit {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    task_id: row.get(2)?,
                    message: row.get(3)?,
                    diff: row.get(4)?,
                    status: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|_| "Pending commit not found.".to_string())?;

    if pending.status != "pending" {
        return Err("Commit already resolved.".into());
    }

    let root = project_folder(&db, &pending.project_id)?;

    check_or_request(
        &conn,
        &pending.project_id,
        pending.task_id.as_deref(),
        "ask-first",
        "git",
        "commit",
        "*",
        &format!("Create Git commit: {}", pending.message),
        "high",
        true,
        None,
    )?;

    git_cmd(&root, &["add", "-A"])?;

    let has_user = git_cmd(&root, &["config", "user.name"]).is_ok();

    if has_user {
        git_cmd(&root, &["commit", "-m", &pending.message])?;
    } else {
        let git_path = "git".to_string();
        #[cfg(target_os = "macos")]
        let git_path = {
            let mut path = git_path;
            if Command::new("git").arg("--version").output().is_err() {
                if std::path::Path::new("/opt/homebrew/bin/git").exists() {
                    path = "/opt/homebrew/bin/git".to_string();
                } else if std::path::Path::new("/usr/local/bin/git").exists() {
                    path = "/usr/local/bin/git".to_string();
                }
            }
            path
        };

        let output = Command::new(&git_path)
            .args(&["commit", "-m", &pending.message])
            .current_dir(&root)
            .env("GIT_AUTHOR_NAME", "Aura OS")
            .env("GIT_AUTHOR_EMAIL", "aura@aura-os.org")
            .env("GIT_COMMITTER_NAME", "Aura OS")
            .env("GIT_COMMITTER_EMAIL", "aura@aura-os.org")
            .output()
            .map_err(|e| format!("Failed to run fallback git commit: {e}"))?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(err.trim().to_string());
        }
    }

    conn.execute(
        "UPDATE pending_commits SET status = 'approved' WHERE id = ?1",
        params![commit_id],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(pending.project_id.clone()),
            task_id: pending.task_id.clone(),
            actor: "user".into(),
            category: "git".into(),
            action: "commit".into(),
            target: None,
            summary: format!("Committed: {}", pending.message),
            risk: Some("medium".into()),
            decision: Some("allow-once".into()),
            result: "succeeded".into(),
            metadata: None,
        },
    )?;

    Ok(PendingCommit {
        status: "approved".into(),
        ..pending
    })
}

#[tauri::command]
pub fn list_pending_commits(
    db: State<'_, DbState>,
    project_id: Option<String>,
) -> Result<Vec<PendingCommit>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = if project_id.is_some() {
        "SELECT id, project_id, task_id, message, diff, status, created_at
         FROM pending_commits WHERE status = 'pending' AND project_id = ?1 ORDER BY created_at ASC"
    } else {
        "SELECT id, project_id, task_id, message, diff, status, created_at
         FROM pending_commits WHERE status = 'pending' ORDER BY created_at ASC"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let map = |row: &rusqlite::Row<'_>| {
        Ok(PendingCommit {
            id: row.get(0)?,
            project_id: row.get(1)?,
            task_id: row.get(2)?,
            message: row.get(3)?,
            diff: row.get(4)?,
            status: row.get(5)?,
            created_at: row.get(6)?,
        })
    };
    let rows = if let Some(pid) = project_id {
        stmt.query_map(params![pid], map)
    } else {
        stmt.query_map([], map)
    }
    .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitLogEntry {
    pub hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub refs: String,
    pub graph: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchInfo {
    pub name: String,
    pub current: bool,
    pub remote: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStashEntry {
    pub index: u32,
    pub message: String,
}

#[tauri::command]
pub fn git_log(
    db: State<'_, DbState>,
    project_id: String,
    max_count: Option<u32>,
) -> Result<Vec<GitLogEntry>, String> {
    let root = project_folder(&db, &project_id)?;
    if !is_git_repo(&root) {
        return Err("Not a Git repository.".into());
    }
    let count = max_count.unwrap_or(30).to_string();
    let raw = git_cmd(
        &root,
        &[
            "log",
            "--all",
            "--oneline",
            "--graph",
            "--decorate",
            "--date=short",
            &format!("--max-count={}", count),
            "--format=::HASH::%H::AUTHOR::%an::DATE::%ad::REFS::%D::GRAPH::%s",
        ],
    )?;
    let mut entries = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let graph_end = line.find(|c| c != '|' && c != '*' && c != '/' && c != '\\' && c != ' ' && c != '-' && c != '.');
        let graph_part = match graph_end {
            Some(i) => &line[..i],
            None => line,
        };
        let rest = match graph_end {
            Some(i) => line[i..].trim(),
            None => "",
        };
        let hash = rest.split("::AUTHOR::").next().unwrap_or("").replace("::HASH::", "").trim().to_string();
        if hash.is_empty() {
            continue;
        }
        let author = rest.split("::AUTHOR::").nth(1)
            .and_then(|s| s.split("::DATE::").next())
            .unwrap_or("")
            .to_string();
        let date = rest.split("::DATE::").nth(1)
            .and_then(|s| s.split("::REFS::").next())
            .unwrap_or("")
            .to_string();
        let refs = rest.split("::REFS::").nth(1)
            .and_then(|s| s.split("::GRAPH::").next())
            .unwrap_or("")
            .to_string();
        let message = rest.split("::GRAPH::").nth(1).unwrap_or("").to_string();
        entries.push(GitLogEntry {
            hash: hash.chars().take(12).collect(),
            author,
            date,
            message,
            refs,
            graph: graph_part.to_string(),
        });
    }
    Ok(entries)
}

#[tauri::command]
pub fn git_branches(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<Vec<GitBranchInfo>, String> {
    let root = project_folder(&db, &project_id)?;
    if !is_git_repo(&root) {
        return Err("Not a Git repository.".into());
    }
    let raw = git_cmd(&root, &["branch", "--all", "--format=%(refname:short):::%(HEAD)"])?;
    let mut branches = Vec::new();
    for line in raw.lines() {
        let parts: Vec<&str> = line.split(":::").collect();
        if parts.is_empty() || parts[0].is_empty() {
            continue;
        }
        let name = parts[0].to_string();
        let current = parts.get(1).map(|h| *h == "*").unwrap_or(false);
        let remote = if name.starts_with("remotes/") {
            Some(name.clone())
        } else {
            None
        };
        branches.push(GitBranchInfo {
            name,
            current,
            remote,
        });
    }
    Ok(branches)
}

#[tauri::command]
pub fn git_stash_list(
    db: State<'_, DbState>,
    project_id: String,
) -> Result<Vec<GitStashEntry>, String> {
    let root = project_folder(&db, &project_id)?;
    if !is_git_repo(&root) {
        return Err("Not a Git repository.".into());
    }
    let raw = git_cmd(&root, &["stash", "list"]).unwrap_or_default();
    let mut entries = Vec::new();
    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let colon = trimmed.find(':');
        let (idx_str, msg) = match colon {
            Some(i) => (&trimmed[..i], trimmed[i + 1..].trim()),
            None => (trimmed, ""),
        };
        let index: u32 = idx_str
            .trim_start_matches("stash@{")
            .trim_end_matches('}')
            .parse()
            .unwrap_or(0);
        entries.push(GitStashEntry {
            index,
            message: msg.to_string(),
        });
    }
    Ok(entries)
}

#[tauri::command]
pub fn git_stash_push(
    db: State<'_, DbState>,
    project_id: String,
    message: Option<String>,
) -> Result<String, String> {
    let root = project_folder(&db, &project_id)?;
    if !is_git_repo(&root) {
        return Err("Not a Git repository.".into());
    }
    let mut args = vec!["stash", "push"];
    if let Some(ref msg) = message {
        args.push("-m");
        args.push(msg);
    }
    git_cmd(&root, &args)?;
    Ok("Stashed.".into())
}

#[tauri::command]
pub fn git_stash_pop(
    db: State<'_, DbState>,
    project_id: String,
    index: Option<u32>,
) -> Result<String, String> {
    let root = project_folder(&db, &project_id)?;
    if !is_git_repo(&root) {
        return Err("Not a Git repository.".into());
    }
    if let Some(idx) = index {
        git_cmd(&root, &["stash", "pop", &format!("stash@{{{}}}", idx)])?;
    } else {
        git_cmd(&root, &["stash", "pop"])?;
    }
    Ok("Stash popped.".into())
}

pub fn tool_git_status(db: &DbState, project_id: &str) -> Result<GitStatusResult, String> {
    git_status_inner(db, project_id)
}

pub fn tool_git_diff(db: &DbState, project_id: &str, file_path: Option<&str>) -> Result<String, String> {
    let result = git_diff_inner(db, project_id, file_path)?;
    Ok(result.diff)
}
