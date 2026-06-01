pub fn is_file_task_prompt(prompt: &str) -> bool {
    let lower = prompt.to_lowercase();
    let hints = [
        "create", "make", "write", "add", "build", "scaffold", "generate", "implement", "fix",
        "code", "program", "file", "ملف", "فايل", "انش", "إنش", "سوي", "اعمل", "اكتب", "برمج",
        "عدل", "عدّل",
    ];
    hints.iter().any(|h| lower.contains(h))
        || prompt
            .chars()
            .any(|c| c.is_ascii_alphanumeric() || c == '.' || c == '/' || c == '-' || c == '_')
            && prompt.contains('.')
}

pub fn infer_path_from_prompt(prompt: &str) -> Option<String> {
    for token in prompt.split_whitespace() {
        let cleaned = token.trim_matches(|c: char| {
            matches!(c, '`' | '"' | '\'' | '(' | ')' | '[' | ']' | '،' | '.')
        });
        if cleaned.contains('.') && !cleaned.starts_with("http") {
            let path = cleaned.trim_start_matches("./");
            if path.chars().any(|c| c.is_alphanumeric()) {
                return Some(path.to_string());
            }
        }
    }
    None
}

fn header_to_path(header: &str) -> Option<String> {
    let h = header.trim();
    if h.is_empty() {
        return None;
    }
    if let Some(idx) = h.find(':') {
        let after = h[idx + 1..].trim();
        if let Some(path) = extract_path_token(after) {
            return Some(path);
        }
    }
    extract_path_token(h)
}

fn extract_path_token(s: &str) -> Option<String> {
    let token = s
        .split_whitespace()
        .next()?
        .trim_matches(|c: char| matches!(c, '`' | '"' | '\''));
    if token.contains('.') && token.chars().any(|c| c.is_alphanumeric()) {
        Some(token.trim_start_matches("./").to_string())
    } else {
        None
    }
}

fn ext_from_header(header: &str) -> &'static str {
    let lang = header.split(':').next().unwrap_or(header).trim().to_lowercase();
    match lang.as_str() {
        "typescript" | "ts" => "ts",
        "tsx" => "tsx",
        "javascript" | "js" => "js",
        "jsx" => "jsx",
        "python" | "py" => "py",
        "html" => "html",
        "css" => "css",
        "json" => "json",
        "rust" | "rs" => "rs",
        "go" => "go",
        "java" => "java",
        "markdown" | "md" => "md",
        "shell" | "bash" | "sh" => "sh",
        _ => "txt",
    }
}

pub fn extract_markdown_writes(text: &str, prompt: &str) -> Vec<(String, String)> {
    let mut files = Vec::new();
    let mut rest = text;
    let mut idx = 0usize;

    while let Some(start) = rest.find("```") {
        let after_ticks = &rest[start + 3..];
        let (header, body_start) = match after_ticks.find('\n') {
            Some(nl) => (&after_ticks[..nl], nl + 1),
            None => break,
        };
        let body_rest = &after_ticks[body_start..];
        let Some(end) = body_rest.find("```") else {
            break;
        };
        let content = body_rest[..end].trim_end();
        let header = header.trim();
        if !header.eq_ignore_ascii_case("json") && !content.is_empty() {
            let path = header_to_path(header)
                .or_else(|| infer_path_from_prompt(prompt))
                .unwrap_or_else(|| {
                    if idx == 0 {
                        infer_path_from_prompt(prompt).unwrap_or_else(|| format!("index.{}", ext_from_header(header)))
                    } else {
                        format!("file-{}.{}", idx + 1, ext_from_header(header))
                    }
                });
            files.push((path, content.to_string()));
            idx += 1;
        }
        rest = &body_rest[end + 3..];
    }

    files
}

pub fn strip_code_fences(text: &str) -> String {
    let mut out = String::new();
    let mut rest = text;
    while let Some(start) = rest.find("```") {
        out.push_str(&rest[..start]);
        let after_ticks = &rest[start + 3..];
        let body_start = after_ticks.find('\n').map(|i| i + 1).unwrap_or(after_ticks.len());
        let body_rest = &after_ticks[body_start..];
        if let Some(end) = body_rest.find("```") {
            rest = &body_rest[end + 3..];
        } else {
            rest = "";
            break;
        }
    }
    out.push_str(rest);
    out.split("\n\n\n").collect::<Vec<_>>().join("\n\n").trim().to_string()
}

pub fn brief_write_status(paths: &[String]) -> String {
    match paths.len() {
        0 => "Working on your files…".into(),
        1 => format!("Created `{}`.", paths[0]),
        n => format!("Created {n} files: {}.", paths.join(", ")),
    }
}
