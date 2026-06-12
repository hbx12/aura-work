import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import {
MAX_JSON_BODY_BYTES,
RequestBodyError,
parseJsonBody,
} from "./request-body.js";

function createRequest(
body: string,
headers: Record<string, string> = {},
): IncomingMessage {
const request = Readable.from([Buffer.from(body)]) as IncomingMessage;
request.headers = headers;
return request;
}

describe("parseJsonBody", () => {
it("parses a valid JSON request body", async () => {
const request = createRequest('{"name":"Aura Work"}');

await expect(parseJsonBody<{ name: string }>(request)).resolves.toEqual({
  name: "Aura Work",
});

});

it("returns an empty object for an empty request body", async () => {
const request = createRequest("");

await expect(parseJsonBody<Record<string, never>>(request)).resolves.toEqual(
  {},
);

});

it("rejects malformed JSON with status 400", async () => {
const request = createRequest('{"name":');

await expect(parseJsonBody(request)).rejects.toMatchObject({
  name: "RequestBodyError",
  statusCode: 400,
});

});

it("rejects oversized bodies with status 413", async () => {
const request = createRequest("x".repeat(MAX_JSON_BODY_BYTES + 1));

await expect(parseJsonBody(request)).rejects.toMatchObject({
  name: "RequestBodyError",
  statusCode: 413,
});

});

it("rejects oversized content-length before reading the body", async () => {
const request = createRequest("{}", {
"content-length": String(MAX_JSON_BODY_BYTES + 1),
});

await expect(parseJsonBody(request)).rejects.toMatchObject({
  name: "RequestBodyError",
  statusCode: 413,
});

});
});
