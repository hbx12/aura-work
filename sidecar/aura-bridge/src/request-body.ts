import type { IncomingMessage } from "node:http";

export const MAX_JSON_BODY_BYTES = 64 * 1024;

export class RequestBodyError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export async function parseJsonBody<T>(
  req: IncomingMessage,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<T> {
  const contentLength = Number(req.headers["content-length"]);

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyError("Request body exceeds the 64 KB limit.", 413);
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.length;

    if (receivedBytes > maxBytes) {
      throw new RequestBodyError("Request body exceeds the 64 KB limit.", 413);
    }

    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new RequestBodyError("Malformed JSON request body.", 400);
  }
}