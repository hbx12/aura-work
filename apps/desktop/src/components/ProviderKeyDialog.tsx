import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PROVIDER_META } from "@aura-os/shared";
import type { MessageCatalog } from "@aura-os/i18n";

type AuthMode = "api-key" | "codex-account" | "google-account" | "claude-account";

const CODEX_LOGIN_URL = "https://auth.openai.com/codex/device";

async function openCodexLoginPage(url: string) {
  try {
    await invoke("open_codex_login_page", { url });
  } catch {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
}

interface ProviderKeyDialogProps {
  open: boolean;
  providerId: string | null;
  displayName?: string;
  isLocal?: boolean;
  existingBaseUrl?: string | null;
  existingAuthMode?: string | null;
  onClose: () => void;
  onSave: (apiKey: string | null, baseUrl: string | null, authMode?: AuthMode) => Promise<void>;
  onClear: () => Promise<void>;
  onAfterSave?: (providerId: string) => Promise<string | null>;
  t: (key: keyof MessageCatalog, params?: Record<string, string>) => string;
  locale?: string;
}

export function ProviderKeyDialog({
  open,
  providerId,
  displayName,
  isLocal,
  existingBaseUrl,
  existingAuthMode,
  onClose,
  onSave,
  onClear,
  onAfterSave,
  t,
  locale,
}: ProviderKeyDialogProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("api-key");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [deviceUrl, setDeviceUrl] = useState<string | null>(null);

  const supportsOauth = providerId === "openai";

  useEffect(() => {
    if (open) {
      setApiKey("");
      setBaseUrl(existingBaseUrl ?? "");
      const isOauthMode = existingAuthMode === "codex-account" || existingAuthMode === "google-account" || existingAuthMode === "claude-account";
      setAuthMode(isOauthMode ? (existingAuthMode as AuthMode) : "api-key");
      setError(null);
      setNotice(null);
      setDeviceCode(null);
      setDeviceUrl(null);
    }
  }, [open, existingBaseUrl, existingAuthMode, providerId]);

  if (!open || !providerId) return null;

  const meta = PROVIDER_META[providerId as keyof typeof PROVIDER_META];

  const handleOauthConnect = async () => {
    setSaving(true);
    setError(null);
    setDeviceCode(null);
    setDeviceUrl(null);
    if (providerId === "openai") {
      setNotice(t("provider.key.codexDeviceHint"));
    } else {
      setNotice(locale?.startsWith("ar") ? "يجري بدء تسجيل الدخول..." : "Starting sign-in...");
    }
    try {
      const start = await invoke<{
        status: string;
        mode?: string;
        userCode?: string;
        url?: string;
      }>("start_provider_oauth_login", { providerId, force: true });

      if (start.status === "already_authenticated") {
        const poll = await invoke<{ status: string }>("poll_provider_oauth_login", { providerId });
        if (poll.status === "connected") {
          if (onAfterSave) {
            const msg = await onAfterSave(providerId);
            if (msg) {
              setError(msg);
              setNotice(null);
              return;
            }
          }
          setNotice(providerId === "openai" ? t("provider.key.codexConnected") : (locale?.startsWith("ar") ? "تم ربط الحساب بنجاح." : "Account connected successfully."));
          onClose();
          return;
        }
      }

      const loginUrl = start.url ?? CODEX_LOGIN_URL;
      const isDevice = start.mode === "device";

      if (isDevice && start.userCode) {
        setDeviceCode(start.userCode);
        setDeviceUrl(loginUrl);
        setNotice(t("provider.key.codexDeviceBrowserOpened"));
        await openCodexLoginPage(loginUrl);
      } else {
        setDeviceUrl(loginUrl);
        setNotice(providerId === "openai" ? t("provider.key.codexBrowserOpened") : (locale?.startsWith("ar") ? "يُفترض أن يفتح المتصفح لتسجيل الدخول. أكمل الدخول هناك." : "Your browser should open for sign-in. Complete login there."));
        await openCodexLoginPage(loginUrl);
      }

      const maxWaitSec = 300;
      for (let elapsed = 0; elapsed < maxWaitSec; elapsed += 2) {
        setNotice(providerId === "openai" ? t("provider.key.codexDevicePolling", { seconds: String(elapsed) }) : (locale?.startsWith("ar") ? `بانتظار تسجيل الدخول... (${elapsed} ث)` : `Waiting for sign-in... (${elapsed}s)`));
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await invoke<{ status: string }>("poll_provider_oauth_login", { providerId });
        if (poll.status === "connected") {
          if (onAfterSave) {
            const msg = await onAfterSave(providerId);
            if (msg) {
              setError(msg);
              setNotice(null);
              return;
            }
          }
          setNotice(providerId === "openai" ? t("provider.key.codexConnected") : (locale?.startsWith("ar") ? "تم ربط الحساب بنجاح." : "Account connected successfully."));
          onClose();
          return;
        }
      }
      setError(t("provider.key.codexDeviceTimeout"));
      setNotice(null);
    } catch (e) {
      setError(String(e));
      setNotice(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{displayName ?? meta?.displayName ?? providerId}</h2>
        <p className="modal-desc">
          {isLocal ? t("provider.key.localDesc") : t("provider.key.cloudDesc")}
        </p>
        {error && <p className="modal-error">{error}</p>}
        {notice && <p className="modal-desc">{notice}</p>}

        {supportsOauth && !isLocal && (
          <div className="section" style={{ gap: 10 }}>
            <span className="sec-label">{t("provider.key.authMethod")}</span>
            <div className="seg">
              <button
                type="button"
                className={authMode !== "api-key" ? "active" : ""}
                onClick={() => {
                  const mode = providerId === "openai" ? "codex-account" : providerId === "gemini" ? "google-account" : "claude-account";
                  setAuthMode(mode);
                }}
              >
                {providerId === "openai"
                  ? t("provider.key.codexAccount")
                  : providerId === "gemini"
                  ? t("provider.key.googleAccount")
                  : t("provider.key.claudeAccount")}
              </button>
              <button
                type="button"
                className={authMode === "api-key" ? "active" : ""}
                onClick={() => setAuthMode("api-key")}
              >
                {t("provider.key.apiKeyMode")}
              </button>
            </div>
          </div>
        )}

        {supportsOauth && !isLocal && authMode !== "api-key" ? (
          <>
            <p className="modal-desc">
              {providerId === "openai"
                ? t("provider.key.codexDesc")
                : providerId === "gemini"
                ? (locale?.startsWith("ar") ? "استخدم حساب Google الخاص بك لتسجيل الدخول بأمان." : "Use your Google account to sign in securely.")
                : (locale?.startsWith("ar") ? "استخدم حساب Claude الخاص بك لتسجيل الدخول بأمان." : "Use your Claude account to sign in securely.")}
            </p>
            {deviceCode && (
              <div className="section" style={{ gap: 8, alignItems: "center" }}>
                <span className="sec-label">{t("provider.key.codexDeviceCodeLabel")}</span>
                <code
                  style={{
                    fontSize: "1.5rem",
                    letterSpacing: "0.15em",
                    fontWeight: 700,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "var(--surface-2, rgba(255,255,255,0.06))",
                  }}
                >
                  {deviceCode}
                </code>
                {deviceUrl && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => void openCodexLoginPage(deviceUrl)}
                  >
                    {t("provider.key.codexDeviceOpenLink")}
                  </button>
                )}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>
                {t("common.cancel")}
              </button>
              <button type="button" className="btn primary" disabled={saving} onClick={() => void handleOauthConnect()}>
                {providerId === "openai"
                  ? t("provider.key.connectCodex")
                  : providerId === "gemini"
                  ? (locale?.startsWith("ar") ? "اتصال بحساب Google" : "Connect Google Account")
                  : (locale?.startsWith("ar") ? "اتصال بحساب Claude" : "Connect Claude Account")}
              </button>
            </div>
          </>
        ) : (
          <>
            {!isLocal && (
              <label className="field">
                <span>{t("provider.key.apiKey")}</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-…"
                  autoComplete="off"
                />
              </label>
            )}
            {(isLocal || providerId === "openai-compatible") && (
              <label className="field">
                <span>{t("provider.key.baseUrl")}</span>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={isLocal ? "http://127.0.0.1:11434" : "https://your-endpoint/v1"}
                />
              </label>
            )}
            <div className="modal-actions">
              {!isLocal && (
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await onClear();
                      onClose();
                    } catch (e) {
                      setError(String(e));
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {t("provider.key.remove")}
                </button>
              )}
              <button type="button" className="btn" onClick={onClose}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={saving || (!isLocal && !apiKey.trim() && !baseUrl.trim())}
                onClick={async () => {
                  setSaving(true);
                  setError(null);
                  try {
                    await onSave(
                      isLocal ? null : apiKey.trim() || null,
                      baseUrl.trim() || null,
                      supportsOauth ? authMode : "api-key",
                    );
                    if (onAfterSave) {
                      const msg = await onAfterSave(providerId);
                      if (msg) {
                        setError(msg);
                        return;
                      }
                    }
                    setNotice(t("provider.key.saved"));
                    onClose();
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {t("common.save")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
