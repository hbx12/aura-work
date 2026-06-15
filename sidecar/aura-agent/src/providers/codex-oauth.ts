/**
 * OpenCode-style ChatGPT/Codex OAuth (browser PKCE + device code + token refresh).
 * Reference: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/plugin/openai/codex.ts
 */
import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const ISSUER = "https://auth.openai.com";
const OAUTH_PORT = 1455;
/** Must match Codex CLI Hydra allow-list exactly (localhost, not 127.0.0.1). */
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/auth/callback`;
/** Registered first-party originator for CLIENT_ID (same as Codex CLI / OpenCode). */
const ORIGINATOR = "codex_cli_rs";
const USER_AGENT = "codex_cli_rs/1.0.0";

export interface CodexTokenBundle {
  accessToken: string;
  refreshToken: string;
  accountId?: string;
  expiresIn?: number;
}

interface PkceCodes {
  verifier: string;
  challenge: string;
}

interface DeviceSession {
  deviceAuthId: string;
  userCode: string;
  intervalMs: number;
}

interface IdTokenClaims {
  chatgpt_account_id?: string;
  organizations?: Array<{ id: string }>;
  "https://api.openai.com/auth"?: { chatgpt_account_id?: string };
}

interface TokenResponse {
  id_token?: string;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

let activeDeviceSession: DeviceSession | null = null;
let oauthServer: Server | null = null;
let pendingBrowserAuth:
  | {
      state: string;
      pkce: PkceCodes;
      providerId?: string;
      resolve: (tokens: CodexTokenBundle) => void;
      reject: (err: Error) => void;
    }
  | null = null;
let browserAuthResult: CodexTokenBundle | null = null;
let browserAuthError: string | null = null;

function parseJwtClaims(token: string): IdTokenClaims | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as IdTokenClaims;
  } catch {
    return undefined;
  }
}

function extractAccountId(accessToken: string, idToken?: string): string | undefined {
  if (idToken) {
    const claims = parseJwtClaims(idToken);
    const id =
      claims?.chatgpt_account_id ??
      claims?.["https://api.openai.com/auth"]?.chatgpt_account_id ??
      claims?.organizations?.[0]?.id;
    if (id) return id;
  }
  const claims = parseJwtClaims(accessToken);
  return (
    claims?.chatgpt_account_id ??
    claims?.["https://api.openai.com/auth"]?.chatgpt_account_id ??
    claims?.organizations?.[0]?.id
  );
}

export function extractAccountIdFromToken(token: string): string | undefined {
  return extractAccountId(token);
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generatePKCE(): Promise<PkceCodes> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const verifier = Array.from(randomBytes(43))
    .map((b) => chars[b % chars.length])
    .join("");
  const challenge = base64UrlEncode(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function tokensFromResponse(tokens: TokenResponse): CodexTokenBundle {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accountId: extractAccountId(tokens.access_token, tokens.id_token),
    expiresIn: tokens.expires_in,
  };
}

async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
  pkce: PkceCodes,
): Promise<CodexTokenBundle> {
  const tokenResponse = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: pkce.verifier,
    }).toString(),
  });
  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Token exchange failed (${tokenResponse.status}): ${body.slice(0, 200)}`);
  }
  return tokensFromResponse((await tokenResponse.json()) as TokenResponse);
}

async function exchangeDeviceCode(authCode: string, codeVerifier: string): Promise<CodexTokenBundle> {
  const tokenResponse = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: `${ISSUER}/deviceauth/callback`,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    }).toString(),
  });
  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Token exchange failed (${tokenResponse.status}): ${body.slice(0, 200)}`);
  }
  return tokensFromResponse((await tokenResponse.json()) as TokenResponse);
}

function buildAuthorizeUrl(redirectUri: string, pkce: PkceCodes, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "openid profile email offline_access",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    state,
    originator: ORIGINATOR,
  });
  return `${ISSUER}/oauth/authorize?${params.toString()}`;
}

const HTML_SUCCESS = `<!doctype html><html><head><title>Aura Work — Signed in</title></head><body style="font-family:system-ui;text-align:center;padding:3rem;background:#131010;color:#f1ecec"><h1>Signed in successfully</h1><p>Return to Aura Work. You can close this tab.</p></body></html>`;

const HTML_GOOGLE = (state: string) => `<!doctype html><html>
<head>
  <title>Aura Work — Sign in with Google</title>
  <style>
    body { font-family: system-ui; text-align: center; padding: 3rem; background: #131010; color: #f1ecec; }
    .btn { background: #3a6fc4; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 20px; transition: background 0.2s; }
    .btn:hover { background: #4a7fd4; }
  </style>
</head>
<body>
  <h1>Sign in with Google</h1>
  <p>Aura Work wants to access your Google Account for Gemini Integration.</p>
  <form action="/auth/callback" method="GET">
    <input type="hidden" name="code" value="mock-google-token-xyz" />
    <input type="hidden" name="state" value="${state}" />
    <button type="submit" class="btn">Authorize Google Account</button>
  </form>
</body></html>`;

const HTML_CLAUDE = (state: string) => `<!doctype html><html>
<head>
  <title>Aura Work — Sign in with Claude</title>
  <style>
    body { font-family: system-ui; text-align: center; padding: 3rem; background: #131010; color: #f1ecec; }
    .btn { background: #d97706; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 20px; transition: background 0.2s; }
    .btn:hover { background: #ea580c; }
  </style>
</head>
<body>
  <h1>Sign in with Claude (Anthropic)</h1>
  <p>Aura Work wants to access your Anthropic Account for Claude Integration.</p>
  <form action="/auth/callback" method="GET">
    <input type="hidden" name="code" value="mock-claude-token-xyz" />
    <input type="hidden" name="state" value="${state}" />
    <button type="submit" class="btn">Authorize Claude Account</button>
  </form>
</body></html>`;

const htmlError = (error: string) =>
  `<!doctype html><html><head><title>Aura Work — Sign-in failed</title></head><body style="font-family:system-ui;text-align:center;padding:3rem;background:#131010;color:#f1ecec"><h1>Sign-in failed</h1><p>${error}</p><p>Close this tab and click Connect again in Aura Work.</p></body></html>`;

async function ensureOAuthServer(): Promise<void> {
  if (oauthServer) return;

  oauthServer = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${OAUTH_PORT}`);

    if (url.pathname === "/auth/google") {
      const state = url.searchParams.get("state") || "";
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML_GOOGLE(state));
      return;
    }

    if (url.pathname === "/auth/claude") {
      const state = url.searchParams.get("state") || "";
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML_CLAUDE(state));
      return;
    }

    if (url.pathname === "/auth/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error) {
        const msg = errorDescription || error;
        browserAuthError = msg;
        pendingBrowserAuth?.reject(new Error(msg));
        pendingBrowserAuth = null;
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(htmlError(msg));
        return;
      }

      if (!code || !pendingBrowserAuth || state !== pendingBrowserAuth.state) {
        const msg = "Invalid OAuth state. Close this tab and click Connect again in Aura Work.";
        browserAuthError = msg;
        pendingBrowserAuth?.reject(new Error(msg));
        pendingBrowserAuth = null;
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(htmlError(msg));
        return;
      }

      const current = pendingBrowserAuth;
      pendingBrowserAuth = null;

      if (current.providerId === "gemini" || current.providerId === "anthropic") {
        const tokens: CodexTokenBundle = {
          accessToken: code || `mock-${current.providerId}-token`,
          refreshToken: `mock-${current.providerId}-refresh`,
          accountId: `mock-${current.providerId}-account`,
        };
        browserAuthResult = tokens;
        browserAuthError = null;
        current.resolve(tokens);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(HTML_SUCCESS);
        return;
      }

      exchangeAuthorizationCode(code, REDIRECT_URI, current.pkce)
        .then((tokens) => {
          browserAuthResult = tokens;
          browserAuthError = null;
          current.resolve(tokens);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(HTML_SUCCESS);
        })
        .catch((err: Error) => {
          browserAuthError = err.message;
          current.reject(err);
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(htmlError(err.message));
        });
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  await new Promise<void>((resolve, reject) => {
    oauthServer!.once("error", (err: NodeJS.ErrnoException) => {
      oauthServer = null;
      reject(err);
    });
    oauthServer!.listen(OAUTH_PORT, () => resolve());
  });
}

function stopOAuthServer() {
  if (oauthServer) {
    oauthServer.close();
    oauthServer = null;
  }
}

export function cancelCodexAuth(): void {
  activeDeviceSession = null;
  browserAuthResult = null;
  browserAuthError = null;
  if (pendingBrowserAuth) {
    pendingBrowserAuth.reject(new Error("Login cancelled"));
    pendingBrowserAuth = null;
  }
  stopOAuthServer();
}

export async function startProviderBrowserAuth(providerId: string): Promise<{ url: string; mode: "browser" }> {
  cancelCodexAuth();
  browserAuthResult = null;
  browserAuthError = null;

  const pkce = await generatePKCE();
  const state = base64UrlEncode(randomBytes(32));
  await ensureOAuthServer();

  pendingBrowserAuth = {
    state,
    pkce,
    providerId,
    resolve: (tokens) => {
      browserAuthResult = tokens;
    },
    reject: (err) => {
      browserAuthError = err.message;
    },
  };

  let url = "";
  if (providerId === "gemini") {
    url = `http://localhost:${OAUTH_PORT}/auth/google?state=${state}`;
  } else if (providerId === "anthropic") {
    url = `http://localhost:${OAUTH_PORT}/auth/claude?state=${state}`;
  } else {
    url = buildAuthorizeUrl(REDIRECT_URI, pkce, state);
  }

  return {
    url,
    mode: "browser",
  };
}

export async function startCodexBrowserAuth(): Promise<{ url: string; mode: "browser" }> {
  return startProviderBrowserAuth("openai");
}

export async function pollCodexBrowserAuthOnce(): Promise<
  { status: "waiting" } | { status: "success"; tokens: CodexTokenBundle } | { status: "failed"; message: string }
> {
  if (browserAuthResult) {
    const tokens = browserAuthResult;
    browserAuthResult = null;
    stopOAuthServer();
    return { status: "success", tokens };
  }
  if (browserAuthError) {
    const message = browserAuthError;
    browserAuthError = null;
    stopOAuthServer();
    return { status: "failed", message };
  }
  if (!pendingBrowserAuth && !oauthServer) {
    return { status: "failed", message: "No active browser login. Click Connect again." };
  }
  return { status: "waiting" };
}

export async function startCodexDeviceAuth(): Promise<{
  userCode: string;
  url: string;
  deviceAuthId: string;
  mode: "device";
}> {
  cancelCodexAuth();

  const deviceResponse = await fetch(`${ISSUER}/api/accounts/deviceauth/usercode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      originator: ORIGINATOR,
    },
    body: JSON.stringify({ client_id: CLIENT_ID }),
  });

  if (!deviceResponse.ok) {
    const body = await deviceResponse.text();
    throw new Error(`Device auth failed (${deviceResponse.status}): ${body.slice(0, 200)}`);
  }

  const deviceData = (await deviceResponse.json()) as {
    device_auth_id: string;
    user_code: string;
    interval: string;
  };

  activeDeviceSession = {
    deviceAuthId: deviceData.device_auth_id,
    userCode: deviceData.user_code,
    intervalMs: Math.max(parseInt(deviceData.interval, 10) || 5, 1) * 1000,
  };

  const url = `${ISSUER}/codex/device`;
  return {
    userCode: deviceData.user_code,
    url,
    deviceAuthId: deviceData.device_auth_id,
    mode: "device",
  };
}

export async function pollCodexDeviceAuthOnce(): Promise<
  { status: "waiting" } | { status: "success"; tokens: CodexTokenBundle }
> {
  if (!activeDeviceSession) {
    throw new Error("No active device login session. Click Connect first.");
  }

  const response = await fetch(`${ISSUER}/api/accounts/deviceauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      originator: ORIGINATOR,
    },
    body: JSON.stringify({
      device_auth_id: activeDeviceSession.deviceAuthId,
      user_code: activeDeviceSession.userCode,
    }),
  });

  if (response.ok) {
    const data = (await response.json()) as {
      authorization_code: string;
      code_verifier: string;
    };
    const tokens = await exchangeDeviceCode(data.authorization_code, data.code_verifier);
    activeDeviceSession = null;
    return { status: "success", tokens };
  }

  if (response.status === 403 || response.status === 404) {
    return { status: "waiting" };
  }

  const body = await response.text();
  throw new Error(`Device auth poll failed (${response.status}): ${body.slice(0, 200)}`);
}

export async function refreshCodexAccessToken(refreshToken: string): Promise<CodexTokenBundle> {
  const response = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }).toString(),
  });
  if (!response.ok) {
    throw new Error(`Token refresh failed (${response.status})`);
  }
  const tokens = (await response.json()) as TokenResponse;
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refreshToken,
    accountId: extractAccountId(tokens.access_token, tokens.id_token),
    expiresIn: tokens.expires_in,
  };
}

export async function startProviderLogin(providerId: string): Promise<{
  url: string;
  mode: "browser" | "device";
  userCode?: string;
  deviceAuthId?: string;
}> {
  if (providerId === "openai") {
    try {
      return await startProviderBrowserAuth("openai");
    } catch (err) {
      const session = await startCodexDeviceAuth();
      return session;
    }
  } else {
    return startProviderBrowserAuth(providerId);
  }
}

/** Browser login first; device code if browser server cannot bind port 1455. */
export async function startCodexLogin(): Promise<{
  url: string;
  mode: "browser" | "device";
  userCode?: string;
  deviceAuthId?: string;
}> {
  return startProviderLogin("openai");
}

export async function pollCodexLoginOnce(): Promise<
  | { status: "waiting" }
  | { status: "success"; tokens: CodexTokenBundle }
  | { status: "failed"; message: string }
> {
  if (oauthServer || pendingBrowserAuth || browserAuthResult || browserAuthError) {
    return pollCodexBrowserAuthOnce();
  }
  if (activeDeviceSession) {
    return pollCodexDeviceAuthOnce();
  }
  return { status: "failed", message: "No active login session. Click Connect again." };
}
