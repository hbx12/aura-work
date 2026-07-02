/**
 * Stream JSON events from agent sidecar SSE endpoint.
 */
export interface StreamEvent {
  type: string;
  data: unknown;
}

export type StreamCallback = (event: StreamEvent) => void;

export async function streamFromAgent(
  url: string,
  token: string | undefined,
  onEvent: StreamCallback,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };
  if (token) headers["X-Sidecar-Auth"] = token;

  const res = await fetch(url, { headers, signal });
  if (!res.ok) {
    throw new Error(`Stream failed: HTTP ${res.status}`);
  }

  const body = res.body;
  if (!body) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          onEvent({ type: parsed.type ?? "message", data: parsed });
        } catch {
          onEvent({ type: "raw", data });
        }
      }
    }
  }
}
