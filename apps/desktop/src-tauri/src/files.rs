use crate::audit::{append_audit, AppendAuditInput};
use crate::db::DbState;
use crate::permissions::{check_task_permission, scheduled_auto_write_allowed};
use rusqlite::params;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::State;

const DEFAULT_EXCLUDES: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    "build",
    "target",
    ".venv",
    "venv",
    ".next",
    ".turbo",
    ".cache",
];

const SECRET_EXCLUDES: &[&str] = &[".env", ".env.local", ".env.production", "id_rsa", "id_ed25519"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub path: String,
    pub line: u32,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingEdit {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub file_path: String,
    pub original_content: String,
    pub proposed_content: String,
    pub diff: String,
    pub status: String,
    pub created_at: String,
}

pub fn init_file_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pending_edits (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            task_id TEXT,
            file_path TEXT NOT NULL,
            original_content TEXT NOT NULL,
            proposed_content TEXT NOT NULL,
            diff TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| e.to_string())
}

pub fn project_folder(db: &DbState, project_id: &str) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT folder_path FROM projects WHERE id = ?1",
        params![project_id],
        |row| row.get(0),
    )
    .map_err(|_| "Project not found.".to_string())
}

pub fn project_permission_mode(db: &DbState, project_id: &str) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT permission_mode FROM projects WHERE id = ?1",
        params![project_id],
        |row| row.get(0),
    )
    .map_err(|_| "Project not found.".to_string())
}

fn normalize_rel(path: &str) -> String {
    path.replace('\\', "/").trim_start_matches("./").to_string()
}

pub fn resolve_project_path(root: &str, rel: &str) -> Result<PathBuf, String> {
    resolve_under_root(root, rel, false)
}

fn resolve_under_root(root: &str, rel: &str, allow_missing: bool) -> Result<PathBuf, String> {
    let root = PathBuf::from(root);
    let rel = normalize_rel(rel);
    if rel.contains("..") {
        return Err("Path traversal is not allowed.".into());
    }
    let joined = root.join(&rel);
    let canonical_root = root
        .canonicalize()
        .map_err(|e| format!("Project folder not accessible: {e}"))?;
    if allow_missing {
        let mut check = joined.clone();
        while !check.exists() {
            if let Some(parent) = check.parent() {
                if parent.starts_with(&root) || parent == root {
                    check = parent.to_path_buf();
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        if check.exists() {
            let canonical_parent = check
                .canonicalize()
                .map_err(|e| format!("Path error: {e}"))?;
            if !canonical_parent.starts_with(&canonical_root) {
                return Err("Path is outside the project folder.".into());
            }
        }
        Ok(joined)
    } else {
        let canonical = joined
            .canonicalize()
            .map_err(|e| format!("File not found: {e}"))?;
        if !canonical.starts_with(&canonical_root) {
            return Err("Path is outside the project folder.".into());
        }
        Ok(canonical)
    }
}

fn path_has_component(path: &Path, name: &str) -> bool {
    path.components().any(|c| {
        matches!(c, Component::Normal(n) if n.to_string_lossy().eq_ignore_ascii_case(name))
    })
}

pub fn is_excluded(rel: &str, include_secrets: bool) -> bool {
    let p = Path::new(rel);
    for ex in DEFAULT_EXCLUDES {
        if path_has_component(p, ex) {
            return true;
        }
    }
    if !include_secrets {
        let file_name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if SECRET_EXCLUDES.iter().any(|s| file_name == *s) {
            return true;
        }
        if file_name.starts_with(".env") {
            return true;
        }
    }
    false
}

fn simple_diff(old: &str, new: &str) -> String {
    let old_lines: Vec<&str> = old.lines().collect();
    let new_lines: Vec<&str> = new.lines().collect();
    let mut out = String::new();
    let max = old_lines.len().max(new_lines.len());
    for i in 0..max {
        let o = old_lines.get(i).copied().unwrap_or("");
        let n = new_lines.get(i).copied().unwrap_or("");
        if o != n {
            if !o.is_empty() {
                out.push_str(&format!("-{o}\n"));
            }
            if !n.is_empty() {
                out.push_str(&format!("+{n}\n"));
            }
        }
    }
    if out.is_empty() {
        out.push_str("(no line changes — content replaced)\n");
    }
    out
}

pub fn read_file_internal(root: &str, rel: &str) -> Result<String, String> {
    if is_excluded(rel, false) {
        return Err(format!("Path excluded by policy: {rel}"));
    }
    let path = resolve_project_path(root, rel)?;
    if path.is_dir() {
        return Err("Path is a directory.".into());
    }
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > 2_000_000 {
        return Err("File too large to read (>2MB).".into());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

pub fn write_file_internal(root: &str, rel: &str, content: &str) -> Result<(), String> {
    if is_excluded(rel, false) {
        return Err(format!("Path excluded by policy: {rel}"));
    }
    let path = resolve_under_root(root, rel, true)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn list_dir_internal(root: &str, rel: Option<&str>, depth: u32) -> Result<Vec<FileEntry>, String> {
    let base = if let Some(r) = rel {
        resolve_project_path(root, r)?
    } else {
        PathBuf::from(root)
    };
    let mut out = Vec::new();
    walk_dir(&base, root, depth, &mut out)?;
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

fn walk_dir(
    dir: &Path,
    root: &str,
    depth: u32,
    out: &mut Vec<FileEntry>,
) -> Result<(), String> {
    if depth == 0 {
        return Ok(());
    }
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let rel = path
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        if is_excluded(&rel, false) {
            continue;
        }
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        out.push(FileEntry {
            path: rel.clone(),
            name: entry.file_name().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: if meta.is_file() { Some(meta.len()) } else { None },
        });
        if meta.is_dir() {
            walk_dir(&path, root, depth.saturating_sub(1), out)?;
        }
    }
    Ok(())
}

pub fn search_files_internal(root: &str, query: &str, limit: u32) -> Result<Vec<SearchMatch>, String> {
    let q = query.to_lowercase();
    if q.len() < 2 {
        return Err("Search query too short.".into());
    }
    let files = list_dir_internal(root, None, 6)?;
    let mut matches = Vec::new();
    for f in files {
        if f.is_dir {
            continue;
        }
        if !looks_textual(&f.path) {
            continue;
        }
        let content = match read_file_internal(root, &f.path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for (i, line) in content.lines().enumerate() {
            if line.to_lowercase().contains(&q) {
                matches.push(SearchMatch {
                    path: f.path.clone(),
                    line: (i + 1) as u32,
                    snippet: line.chars().take(200).collect(),
                });
                if matches.len() >= limit as usize {
                    return Ok(matches);
                }
            }
        }
    }
    Ok(matches)
}

fn looks_textual(path: &str) -> bool {
    let lower = path.to_lowercase();
    [
        ".txt", ".md", ".json", ".yaml", ".yml", ".toml", ".xml", ".html", ".css", ".js", ".ts",
        ".tsx", ".jsx", ".rs", ".py", ".go", ".java", ".c", ".cpp", ".h", ".sql", ".sh", ".env",
    ]
    .iter()
    .any(|ext| lower.ends_with(ext))
        || !lower.contains('.')
}

#[tauri::command]
pub fn list_project_files(
    db: State<'_, DbState>,
    project_id: String,
    sub_path: Option<String>,
    depth: Option<u32>,
) -> Result<Vec<FileEntry>, String> {
    let root = project_folder(&db, &project_id)?;
    list_dir_internal(&root, sub_path.as_deref(), depth.unwrap_or(3))
}

#[tauri::command]
pub fn read_project_file(
    db: State<'_, DbState>,
    project_id: String,
    file_path: String,
) -> Result<String, String> {
    let root = project_folder(&db, &project_id)?;
    read_file_internal(&root, &file_path)
}

#[tauri::command]
pub fn search_project_files(
    db: State<'_, DbState>,
    project_id: String,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<SearchMatch>, String> {
    let root = project_folder(&db, &project_id)?;
    search_files_internal(&root, &query, limit.unwrap_or(50))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteFileInput {
    pub project_id: String,
    pub task_id: Option<String>,
    pub file_path: String,
    pub content: String,
    pub skip_permission: Option<bool>,
}

#[tauri::command]
pub fn write_project_file(
    db: State<'_, DbState>,
    input: WriteFileInput,
) -> Result<PendingEdit, String> {
    write_project_file_inner(&db, input)
}

pub fn write_project_file_inner(
    db: &DbState,
    input: WriteFileInput,
) -> Result<PendingEdit, String> {
    let root = project_folder(&db, &input.project_id)?;
    let mode = project_permission_mode(&db, &input.project_id)?;
    let rel = normalize_rel(&input.file_path);

    if !input.skip_permission.unwrap_or(false) {
        check_task_permission(
            db,
            &input.project_id,
            input.task_id.as_deref(),
            "file",
            "write",
            &rel,
            &format!("Write changes to {rel}"),
            "medium",
            false,
            None,
        )?;
    }

    let original = read_file_internal(&root, &rel).unwrap_or_default();
    let diff = simple_diff(&original, &input.content);

    let auto_write = scheduled_auto_write_allowed(db, input.task_id.as_deref(), &rel);
    if mode == "ask-first" && !auto_write && !input.skip_permission.unwrap_or(false) {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO pending_edits (id, project_id, task_id, file_path, original_content, proposed_content, diff, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8)",
            params![
                id,
                input.project_id,
                input.task_id,
                rel,
                original,
                input.content,
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
                category: "file".into(),
                action: "write_proposed".into(),
                target: Some(rel.clone()),
                summary: format!("Proposed edit to {rel}"),
                risk: Some("medium".into()),
                decision: None,
                result: "requested".into(),
                metadata: None,
            },
        )?;

        return Ok(PendingEdit {
            id,
            project_id: input.project_id,
            task_id: input.task_id,
            file_path: rel,
            original_content: original,
            proposed_content: input.content,
            diff,
            status: "pending".into(),
            created_at: now,
        });
    }

    write_file_internal(&root, &rel, &input.content)?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(input.project_id.clone()),
            task_id: input.task_id.clone(),
            actor: "coordinator".into(),
            category: "file".into(),
            action: "write".into(),
            target: Some(rel.clone()),
            summary: format!("Wrote {rel}"),
            risk: Some("low".into()),
            decision: None,
            result: "succeeded".into(),
            metadata: None,
        },
    )?;

    let now = chrono::Utc::now().to_rfc3339();
    Ok(PendingEdit {
        id: String::new(),
        project_id: input.project_id,
        task_id: input.task_id,
        file_path: rel,
        original_content: original,
        proposed_content: input.content.clone(),
        diff,
        status: "applied".into(),
        created_at: now,
    })
}

#[tauri::command]
pub fn approve_pending_edit(db: State<'_, DbState>, edit_id: String) -> Result<PendingEdit, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let edit: PendingEdit = conn
        .query_row(
            "SELECT id, project_id, task_id, file_path, original_content, proposed_content, diff, status, created_at
             FROM pending_edits WHERE id = ?1",
            params![edit_id],
            |row| {
                Ok(PendingEdit {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    task_id: row.get(2)?,
                    file_path: row.get(3)?,
                    original_content: row.get(4)?,
                    proposed_content: row.get(5)?,
                    diff: row.get(6)?,
                    status: row.get(7)?,
                    created_at: row.get(8)?,
                })
            },
        )
        .map_err(|_| "Pending edit not found.".to_string())?;

    if edit.status != "pending" {
        return Err("Edit already resolved.".into());
    }

    let root = project_folder(&db, &edit.project_id)?;
    write_file_internal(&root, &edit.file_path, &edit.proposed_content)?;

    conn.execute(
        "UPDATE pending_edits SET status = 'approved' WHERE id = ?1",
        params![edit_id],
    )
    .map_err(|e| e.to_string())?;

    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(edit.project_id.clone()),
            task_id: edit.task_id.clone(),
            actor: "user".into(),
            category: "file".into(),
            action: "write_approved".into(),
            target: Some(edit.file_path.clone()),
            summary: format!("Approved write to {}", edit.file_path),
            risk: Some("low".into()),
            decision: Some("allow-once".into()),
            result: "succeeded".into(),
            metadata: None,
        },
    )?;

    Ok(PendingEdit {
        status: "approved".into(),
        ..edit
    })
}

#[tauri::command]
pub fn list_pending_edits(
    db: State<'_, DbState>,
    project_id: Option<String>,
    task_id: Option<String>,
) -> Result<Vec<PendingEdit>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = if task_id.is_some() {
        "SELECT id, project_id, task_id, file_path, original_content, proposed_content, diff, status, created_at
         FROM pending_edits WHERE status = 'pending' AND task_id = ?1 ORDER BY created_at ASC"
    } else if project_id.is_some() {
        "SELECT id, project_id, task_id, file_path, original_content, proposed_content, diff, status, created_at
         FROM pending_edits WHERE status = 'pending' AND project_id = ?1 ORDER BY created_at ASC"
    } else {
        "SELECT id, project_id, task_id, file_path, original_content, proposed_content, diff, status, created_at
         FROM pending_edits WHERE status = 'pending' ORDER BY created_at ASC"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let map = |row: &rusqlite::Row<'_>| {
        Ok(PendingEdit {
            id: row.get(0)?,
            project_id: row.get(1)?,
            task_id: row.get(2)?,
            file_path: row.get(3)?,
            original_content: row.get(4)?,
            proposed_content: row.get(5)?,
            diff: row.get(6)?,
            status: row.get(7)?,
            created_at: row.get(8)?,
        })
    };
    let rows = if let Some(tid) = task_id {
        stmt.query_map(params![tid], map)
    } else if let Some(pid) = project_id {
        stmt.query_map(params![pid], map)
    } else {
        stmt.query_map([], map)
    }
    .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Tool execution entry used by task engine (read with permission + audit).
pub fn tool_read_file(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    file_path: &str,
) -> Result<String, String> {
    let root = project_folder(db, project_id)?;
    let rel = normalize_rel(file_path);

    check_task_permission(
        db,
        project_id,
        task_id,
        "file",
        "read",
        &rel,
        &format!("Read file {rel}"),
        "low",
        false,
        None,
    )?;

    let content = read_file_internal(&root, &rel)?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    append_audit(
        &conn,
        &AppendAuditInput {
            project_id: Some(project_id.to_string()),
            task_id: task_id.map(String::from),
            actor: "coordinator".into(),
            category: "file".into(),
            action: "read".into(),
            target: Some(rel),
            summary: format!("Read file {file_path}"),
            risk: Some("low".into()),
            decision: None,
            result: "succeeded".into(),
            metadata: None,
        },
    )?;
    Ok(content)
}

pub fn tool_search_files(
    db: &DbState,
    project_id: &str,
    query: &str,
) -> Result<Vec<SearchMatch>, String> {
    let root = project_folder(db, project_id)?;
    search_files_internal(&root, query, 30)
}

pub fn tool_write_file(
    db: &DbState,
    project_id: &str,
    task_id: Option<&str>,
    file_path: &str,
    content: &str,
) -> Result<PendingEdit, String> {
    write_project_file_inner(
        db,
        WriteFileInput {
            project_id: project_id.to_string(),
            task_id: task_id.map(String::from),
            file_path: file_path.to_string(),
            content: content.to_string(),
            skip_permission: None,
        },
    )
}
