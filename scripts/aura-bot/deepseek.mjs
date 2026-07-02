// DeepSeek API helper for aura-bot
// Uses Node 20 native fetch — no external dependencies required.

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY is not set");
  process.exit(1);
}

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

/**
 * Call the DeepSeek chat completions API.
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [opts]
 * @param {number} [opts.maxTokens] - max output tokens (default 1024)
 * @param {number} [opts.temperature] - sampling temperature (default 0.3)
 * @returns {Promise<string>} assistant message content
 */
export async function chat(messages, opts = {}) {
  const body = {
    model: DEEPSEEK_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.3,
    stream: false,
  };

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}
