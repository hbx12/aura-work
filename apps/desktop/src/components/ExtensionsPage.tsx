import { useState } from "react";
import { Icon } from "@aura-os/ui";
import { BRIDGE_PUBLIC_URL } from "@aura-os/shared";
import type { BridgeClientRecord, BridgeStatus } from "@aura-os/shared";

interface ExtensionsPageProps {
  status: BridgeStatus | null;
  clients: BridgeClientRecord[];
  loading?: boolean;
  error?: string | null;
  onRefresh: () => Promise<void>;
  onStart: () => Promise<unknown>;
  onStop: () => Promise<unknown>;
  onCreatePairing: () => Promise<{ code: string; expiresAt: string }>;
  onRevokeClient: (clientId: string) => Promise<void>;
  embedded?: boolean;
}

export function ExtensionsPage({
  status,
  clients,
  loading,
  error,
  onRefresh,
  onStart,
  onStop,
  onCreatePairing,
  onRevokeClient,
  embedded,
}: ExtensionsPageProps) {
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const showMsg = (m: string) => setMessage(m);

  const body = (
    <>
      {embedded && (
        <>
          <div className="s-title">Extensions</div>
          <p className="s-sub">
            Chrome extension and Office add-ins connect through the local bridge at{" "}
            <code>{BRIDGE_PUBLIC_URL}</code>.
          </p>
        </>
      )}
      {(message || error) && <p className="modal-desc">{message ?? error}</p>}
          <div className="section">
            <span className="sec-label">Local bridge</span>
            <div className="panel">
              <div className="panel-row">
                <div className="prov-logo" style={{ background: "var(--accent)" }}>
                  <Icon name="plug" size={17} />
                </div>
                <div className="prov-meta">
                  <div className="prov-name">
                    {status?.helper.running ? "Bridge running" : "Bridge offline"}
                    {status?.helper.running && <span className="tag ok">Active</span>}
                  </div>
                  <div className="prov-sub">
                    Public {status?.publicPort ?? 47826} · Internal {status?.internalPort ?? 47827} ·{" "}
                    {status?.pairedClientCount ?? 0} paired client(s)
                  </div>
                </div>
              </div>
              <p className="modal-desc">
                Start with <code>npm run bridge</code> or use the button below. Internal API authenticates
                bridge helper; extensions use session tokens from pairing.
              </p>
              <div className="row-actions">
                <button type="button" className="btn primary sm" disabled={loading} onClick={() => void onStart().then(() => showMsg("Bridge started"))}>
                  Start bridge
                </button>
                <button type="button" className="btn sm" disabled={loading} onClick={() => void onStop()}>
                  Stop bridge
                </button>
                <button type="button" className="btn sm" disabled={loading} onClick={() => void onRefresh()}>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="section">
            <span className="sec-label">Pair extension or add-in</span>
            <div className="panel vault-box">
              <p className="modal-desc">
                Generate a code, then enter it in the Chrome extension popup or Office task pane within 10
                minutes.
              </p>
              <button
                type="button"
                className="btn primary sm"
                onClick={async () => {
                  const p = await onCreatePairing();
                  setPairing(p);
                  showMsg(`Pairing code: ${p.code} (expires ${new Date(p.expiresAt).toLocaleTimeString()})`);
                }}
              >
                Generate pairing code
              </button>
              {pairing && (
                <p className="modal-desc">
                  Code: <strong>{pairing.code}</strong> — expires {new Date(pairing.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="section">
            <span className="sec-label">Paired clients</span>
            <div className="panel">
              {clients.length === 0 ? (
                <p className="modal-desc">No paired clients yet.</p>
              ) : (
                clients.map((c) => (
                  <div key={c.id} className="panel-row">
                    <div className="prov-meta">
                      <div className="prov-name">
                        {c.name}
                        {c.revoked && <span className="tag">Revoked</span>}
                        {!c.revoked && <span className="tag ok">Active</span>}
                      </div>
                      <div className="prov-sub">
                        {c.clientType} · paired {new Date(c.pairedAt).toLocaleString()}
                      </div>
                    </div>
                    {!c.revoked && (
                      <button type="button" className="btn sm" onClick={() => void onRevokeClient(c.id)}>
                        Revoke
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <span className="sec-label">Install</span>
            <div className="panel">
              <p className="modal-desc">
                <strong>Chrome:</strong> Load unpacked from <code>extensions/aura-chrome</code> — see README
                there.
              </p>
              <p className="modal-desc">
                <strong>Office:</strong> Sideload manifests from <code>office/word</code>,{" "}
                <code>office/excel</code>, or <code>office/powerpoint</code> — see{" "}
                <code>office/README.md</code>.
              </p>
              <p className="modal-desc">
                Page content reads (Chrome) require explicit approval in Aura desktop even though the
                extension declares broad site access.
              </p>
            </div>
          </div>
    </>
  );

  if (embedded) return body;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Extensions</h1>
        <p>
          Chrome extension and Office add-ins connect through the local bridge at{" "}
          <code>{BRIDGE_PUBLIC_URL}</code>. Bridge runs only while Aura Work is open.
        </p>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">{body}</div>
      </div>
    </div>
  );
}
