export const TOOLS_PROMPT = `Available tools (JSON only for tool calls):
- read_file { "path": "relative/path", "offset": 1, "limit": 200 }
- write_file { "path": "relative/path", "content": "full file content" }
- replace_in_file { "path": "relative/path", "oldText": "exact text to replace", "newText": "replacement text", "replaceAll": false }
- delete_file { "path": "relative/path" }
- glob_files { "pattern": "*.ts or src/*Page.tsx" }
- grep_files { "pattern": "regex pattern", "path": "optional/subdir", "include": "*.ts or *.{ts,tsx}" }
- search_files { "query": "search text" }
- git_status {}
- git_diff { "path": "optional relative path" }
- run_shell { "command": "shell command to run in isolated workspace; output may be tail-truncated with exit metadata" }
- set_theme { "theme": "system|light|dark|amoled|blue|high-contrast|cyberpunk|forest|pastel|sunset|sepia|nord|dracula|matrix|sakura|sakura-dark|coffee|ocean" }
- browse_url { "url": "https://example.com", "extract": "text|links|title" (optional) }
- computer_list_windows {}
- computer_screenshot { "windowId": "optional", "processName": "optional", "title": "optional" }
- computer_click { "x": 100, "y": 200, "processName": "AppName", "title": "Window title" }
- computer_type { "text": "hello", "processName": "AppName", "title": "Window title" }
- computer_focus { "windowId": "123", "processName": "AppName", "title": "Window title" }
- skill { "name": "skill-name" }
- plugin_tool { "pluginId": "com.example.plugin", "toolId": "tool.id", "arguments": {} (optional) }
- mcp_tool { "serverId": "mcp-server-uuid", "toolName": "tool_name", "arguments": {} (optional) }

FORMATTING RULES:
1. When calling a tool, return ONLY a valid JSON object matching the schemas above.
2. For example, to read a file:
   {"type":"tool_calls","role":"coder","toolCalls":[{"id":"1","name":"read_file","arguments":{"path":"README.md"}}]}
3. Do not include markdown code fences (such as \`\`\`json) outside the JSON unless required by your provider. Always make sure the root value is a JSON object.
4. If you fail to follow the strict JSON syntax, the client will reject your output and require recovery.
`;
