import { useState } from "react";
import { Icon } from "@aura-os/ui";
import { DEFAULT_CLOUD_SERVER_URL } from "@aura-os/shared";
import type { CloudAccountStatus, CloudDeviceInfo, CloudSyncStatus } from "@aura-os/shared";

interface CloudPageProps {
  status: CloudAccountStatus | null;
  devices: CloudDeviceInfo[];
  syncHelper: CloudSyncStatus | null;
  loading?: boolean;
  error?: string | null;
  projectId: string | null;
  onRegister: (
    email: string,
    password: string,
    displayName?: string,
    serverUrl?: string,
  ) => Promise<{ recoveryKey: string }>;
  onLogin: (email: string, password: string, serverUrl?: string) => Promise<unknown>;
  onLogout: () => Promise<unknown>;
  onSetupRecovery: (recoveryKey: string) => Promise<unknown>;
  onSetSyncEnabled: (enabled: boolean) => Promise<unknown>;
  onSyncNow: () => Promise<unknown>;
  onCreatePairing: () => Promise<{ code: string; expiresAt: string; qrPayload: string }>;
  onRevokeDevice: (deviceId: string) => Promise<void>;
  onRemoteDispatch: (targetDeviceId: string, projectId: string, prompt: string) => Promise<unknown>;
  onInspectServer: () => Promise<unknown>;
  onStartSyncHelper: () => Promise<unknown>;
  onStopSyncHelper: () => Promise<unknown>;
  t: (key: string, params?: Record<string, string>) => string;
  embedded?: boolean;
}

export function CloudPage({
  status,
  devices,
  syncHelper,
  loading,
  error,
  projectId,
  onRegister,
  onLogin,
  onLogout,
  onSetupRecovery,
  onSetSyncEnabled,
  onSyncNow,
  onCreatePairing,
  onRevokeDevice,
  onRemoteDispatch,
  onInspectServer,
  onStartSyncHelper,
  onStopSyncHelper,
  t,
  embedded,
}: CloudPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [serverUrl, setServerUrl] = useState(DEFAULT_CLOUD_SERVER_URL);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [savedRecoveryKey, setSavedRecoveryKey] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dispatchPrompt, setDispatchPrompt] = useState("");
  const [targetDeviceId, setTargetDeviceId] = useState("");

  const showMsg = (m: string) => setMessage(m);

  const body = (
    <>
      {!embedded && (message || error) && <p className="modal-desc">{message ?? error}</p>}
      {embedded && (
        <>
          <div className="s-title">{t("cloud.title")}</div>
          <p className="s-sub">{t("cloud.subtitle")}</p>
          {(message || error) && <p className="modal-desc">{message ?? error}</p>}
        </>
      )}
          <div className="section">
            <span className="sec-label">{t("cloud.server")}</span>
            <div className="panel">
              <div className="panel-row">
                <div className="prov-logo" style={{ background: "var(--accent)" }}>
                  <Icon name="cloud" size={17} />
                </div>
                <div className="prov-meta">
                  <div className="prov-name">
                    {status?.cloudServerReachable ? t("cloud.reachable") : t("cloud.offline")}
                    {status?.cloudServerReachable && <span className="tag ok">{t("cloud.online")}</span>}
                  </div>
                  <div className="prov-sub">{status?.serverUrl ?? serverUrl}</div>
                </div>
              </div>
              <p className="modal-desc">{t("cloud.selfHost")}</p>
            </div>
          </div>

          {!status?.signedIn ? (
            <div className="section">
              <span className="sec-label">{t("cloud.signInRegister")}</span>
              <div className="plugin-mcp-form vault-box">
                <label className="field">
                  <span>{t("cloud.serverUrl")}</span>
                  <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
                </label>
                <label className="field">
                  <span>{t("cloud.email")}</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="field">
                  <span>{t("cloud.password")}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{t("cloud.displayName")}</span>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </label>
                <div className="panel-actions">
                  <button
                    type="button"
                    className="btn sm primary"
                    disabled={loading || !email || password.length < 8}
                    onClick={async () => {
                      try {
                        await onLogin(email, password, serverUrl);
                        showMsg(t("cloud.signedInMsg"));
                      } catch (e) {
                        showMsg(String(e));
                      }
                    }}
                  >
                    {t("cloud.signIn")}
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={loading || !email || password.length < 8}
                    onClick={async () => {
                      try {
                        const r = await onRegister(email, password, displayName || undefined, serverUrl);
                        setSavedRecoveryKey(r.recoveryKey);
                        showMsg(t("cloud.accountCreatedMsg"));
                      } catch (e) {
                        showMsg(String(e));
                      }
                    }}
                  >
                    {t("cloud.register")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="section">
                <span className="sec-label">{t("cloud.account")}</span>
                <div className="panel">
                  <div className="panel-row">
                    <div className="prov-meta">
                      <div className="prov-name">
                        {status.displayName ?? status.email}
                        <span className="tag ok">{t("cloud.signedIn")}</span>
                      </div>
                      <div className="prov-sub">
                        {t("cloud.deviceInfo", {
                          email: status.email ?? "",
                          device: status.deviceName ?? status.deviceId ?? "",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="panel-actions">
                    <button
                      type="button"
                      className="btn sm"
                      disabled={loading}
                      onClick={async () => {
                        try {
                          await onLogout();
                          showMsg(t("cloud.signedOutMsg"));
                        } catch (e) {
                          showMsg(String(e));
                        }
                      }}
                    >
                      {t("cloud.signOut")}
                    </button>
                  </div>
                </div>
              </div>

              {(savedRecoveryKey || !status.hasRecoveryKey) && (
                <div className="section">
                  <span className="sec-label">{t("cloud.recoveryKey")}</span>
                  <div className="vault-box">
                    {savedRecoveryKey && (
                      <p className="modal-desc">{t("cloud.saveRecoveryKey")}</p>
                    )}
                    {savedRecoveryKey && (
                      <code className="cloud-recovery-key">{savedRecoveryKey}</code>
                    )}
                    {!status.hasRecoveryKey && (
                      <>
                        <label className="field">
                          <span>{t("cloud.enterRecoveryKey")}</span>
                          <input
                            value={recoveryKey}
                            onChange={(e) => setRecoveryKey(e.target.value)}
                            placeholder="aura-..."
                          />
                        </label>
                        <button
                          type="button"
                          className="btn sm primary"
                          disabled={loading || !recoveryKey.trim()}
                          onClick={async () => {
                            try {
                              await onSetupRecovery(recoveryKey.trim());
                              showMsg(t("cloud.recoveryConfigured"));
                            } catch (e) {
                              showMsg(String(e));
                            }
                          }}
                        >
                          {t("cloud.setRecoveryKey")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="section">
                <span className="sec-label">{t("cloud.e2eeSync")}</span>
                <div className="panel">
                  <div className="prov-sub">
                    {t("cloud.syncDesc")}
                    {status.lastSyncAt && (
                      <> {t("cloud.lastSync", { time: new Date(status.lastSyncAt).toLocaleString() })}</>
                    )}
                  </div>
                  <div className="panel-actions">
                    <button
                      type="button"
                      className="btn sm primary"
                      disabled={loading || !status.hasRecoveryKey}
                      onClick={async () => {
                        try {
                          await onSetSyncEnabled(!status.syncEnabled);
                          showMsg(status.syncEnabled ? t("cloud.syncDisabledMsg") : t("cloud.syncEnabledMsg"));
                        } catch (e) {
                          showMsg(String(e));
                        }
                      }}
                    >
                      {status.syncEnabled ? t("cloud.disableSync") : t("cloud.enableSync")}
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={loading || !status.syncEnabled}
                      onClick={async () => {
                        try {
                          await onSyncNow();
                          showMsg(t("cloud.syncCompleted"));
                        } catch (e) {
                          showMsg(String(e));
                        }
                      }}
                    >
                      {t("cloud.syncNow")}
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={loading}
                      onClick={async () => {
                        try {
                          const r = await onInspectServer();
                          showMsg(t("cloud.serverStore", { data: JSON.stringify(r) }));
                        } catch (e) {
                          showMsg(String(e));
                        }
                      }}
                    >
                      {t("cloud.inspectServer")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="section">
                <span className="sec-label">{t("cloud.syncHelper")}</span>
                <div className="panel">
                  <div className="prov-sub">
                    {syncHelper?.running
                      ? t("cloud.syncHelperRunning", {
                          count: String(syncHelper.pendingDispatchCount ?? 0),
                        })
                      : t("cloud.syncHelperOffline")}
                  </div>
                  <div className="panel-actions">
                    <button
                      type="button"
                      className="btn sm primary"
                      disabled={loading || syncHelper?.running}
                      onClick={async () => {
                        try {
                          await onStartSyncHelper();
                          showMsg(t("cloud.syncHelperStarted"));
                        } catch (e) {
                          showMsg(String(e));
                        }
                      }}
                    >
                      {t("cloud.startHelper")}
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={loading || !syncHelper?.running}
                      onClick={async () => {
                        try {
                          await onStopSyncHelper();
                          showMsg(t("cloud.syncHelperStopped"));
                        } catch (e) {
                          showMsg(String(e));
                        }
                      }}
                    >
                      {t("cloud.stopHelper")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="section">
                <span className="sec-label">{t("cloud.devicePairing")}</span>
                <div className="vault-box">
                  {pairingCode ? (
                    <p className="modal-desc">{t("cloud.pairingCode", { code: pairingCode })}</p>
                  ) : (
                    <button
                      type="button"
                      className="btn sm primary"
                      disabled={loading}
                      onClick={async () => {
                        try {
                          const r = await onCreatePairing();
                          setPairingCode(r.code);
                          showMsg(t("cloud.pairingCreated"));
                        } catch (e) {
                          showMsg(String(e));
                        }
                      }}
                    >
                      {t("cloud.generatePairing")}
                    </button>
                  )}
                </div>
              </div>

              <div className="section">
                <span className="sec-label">{t("cloud.pairedDevices")}</span>
                {devices.length === 0 ? (
                  <p className="modal-desc">{t("cloud.noPairedDevices")}</p>
                ) : (
                  devices.map((d) => (
                    <div key={d.id} className="panel" style={{ marginBottom: 8 }}>
                      <div className="panel-row">
                        <div className="prov-meta">
                          <div className="prov-name">
                            {d.name}
                            {d.online && <span className="tag ok">{t("cloud.online")}</span>}
                            {d.id === status.deviceId && <span className="tag">{t("cloud.thisDevice")}</span>}
                          </div>
                          <div className="prov-sub">
                            {t("cloud.lastSeen", {
                              type: d.deviceType,
                              time: new Date(d.lastSeenAt).toLocaleString(),
                            })}
                          </div>
                        </div>
                      </div>
                      {d.id !== status.deviceId && (
                        <div className="panel-actions">
                          <button
                            type="button"
                            className="btn sm danger"
                            disabled={loading}
                            onClick={async () => {
                              try {
                                await onRevokeDevice(d.id);
                                showMsg(t("cloud.revoked", { name: d.name }));
                              } catch (e) {
                                showMsg(String(e));
                              }
                            }}
                          >
                            {t("cloud.revoke")}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="section">
                <span className="sec-label">{t("cloud.remoteDispatch")}</span>
                <div className="plugin-mcp-form vault-box">
                  <p className="modal-desc">{t("cloud.remoteDispatchDesc")}</p>
                  <label className="field">
                    <span>{t("cloud.targetDevice")}</span>
                    <select
                      value={targetDeviceId}
                      onChange={(e) => setTargetDeviceId(e.target.value)}
                    >
                      <option value="">{t("cloud.selectDevice")}</option>
                      {devices
                        .filter((d) => d.deviceType === "desktop")
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}{" "}
                            {d.online ? t("cloud.deviceOnline") : t("cloud.deviceOffline")}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("cloud.taskPrompt")}</span>
                    <textarea
                      rows={2}
                      value={dispatchPrompt}
                      onChange={(e) => setDispatchPrompt(e.target.value)}
                      placeholder={t("cloud.taskPromptPlaceholder")}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn sm primary"
                    disabled={loading || !targetDeviceId || !dispatchPrompt.trim() || !projectId}
                    onClick={async () => {
                      try {
                        const r = await onRemoteDispatch(
                          targetDeviceId,
                          projectId!,
                          dispatchPrompt.trim(),
                        );
                        showMsg(t("cloud.dispatchSent", { data: JSON.stringify(r) }));
                      } catch (e) {
                        showMsg(String(e));
                      }
                    }}
                  >
                    {t("cloud.sendDispatch")}
                  </button>
                </div>
              </div>
            </>
          )}
    </>
  );

  if (embedded) return body;

  return (
    <div className="page">
      <div className="page-head">
        <h1>{t("cloud.title")}</h1>
        <p>{t("cloud.subtitle")}</p>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">{body}</div>
      </div>
    </div>
  );
}
