const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,
  /api[_-]?key["'\s:=]+["']?[a-zA-Z0-9._-]{12,}/gi,
  /password["'\s:=]+["']?[^\s"']{4,}/gi,
  /OPENAI_API_KEY=[^\s]+/gi,
  /ANTHROPIC_API_KEY=[^\s]+/gi,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

export function truncateOutput(text: string, max = 32000): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: `${text.slice(0, max)}\n… [output truncated]`, truncated: true };
}
