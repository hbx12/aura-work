import { Icon } from "@aura-os/ui";
import type { MemoryEntry, PendingMemory } from "@aura-os/shared";

interface MemoryPageProps {
  pending: PendingMemory[];
  memories: MemoryEntry[];
  loading?: boolean;
  error?: string | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
}

export function MemoryPage({
  pending,
  memories,
  loading,
  error,
  onApprove,
  onReject,
  onDelete,
  t,
}: MemoryPageProps) {
  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("nav.memory")}</h1>
            <p>{t("memory.subtitle")}</p>
          </div>
        </div>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          {error && <p className="modal-error">{error}</p>}

          <div className="section">
            <span className="sec-label">{t("memory.pendingSection")}</span>
            {loading && pending.length === 0 ? (
              <p className="muted">{t("common.loading")}</p>
            ) : pending.length === 0 ? (
              <div className="mem-pending">
                <div className="mic" style={{ background: "var(--accent)", color: "#fff" }}>
                  <Icon name="brain" size={15} />
                </div>
                <div className="mbody">
                  <div className="mtxt">{t("memory.pendingTitle")}</div>
                  <div className="mmeta">{t("memory.pendingDesc")}</div>
                </div>
              </div>
            ) : (
              pending.map((item) => (
                <div key={item.id} className="mem-pending">
                  <div className="mic" style={{ background: "var(--warn)", color: "#fff" }}>
                    <Icon name="brain" size={15} />
                  </div>
                  <div className="mbody">
                    <div className="mtxt">{item.content}</div>
                    <div className="mmeta">{new Date(item.createdAt).toLocaleString()}</div>
                    <div className="row" style={{ gap: 8, marginTop: 10 }}>
                      <button type="button" className="btn sm primary" onClick={() => void onApprove(item.id)}>
                        {t("memory.approve")}
                      </button>
                      <button type="button" className="btn sm" onClick={() => void onReject(item.id)}>
                        {t("memory.reject")}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="section">
            <span className="sec-label">
              {t("memory.saved")}
              <span className="count">{memories.length}</span>
            </span>
            <div className="panel">
              {memories.length === 0 ? (
                <div className="empty" style={{ padding: 36 }}>
                  <div className="em-ic">
                    <Icon name="brain" size={26} />
                  </div>
                  <p>{t("memory.empty")}</p>
                  <p className="muted" style={{ font: "var(--text-caption)", marginTop: 8, maxWidth: 360 }}>
                    {t("memory.emptyHint")}
                  </p>
                </div>
              ) : (
                <div className="mem-list">
                  {memories.map((m) => (
                    <div key={m.id} className="mem-pending">
                      <div className="mic" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                        <Icon name="brain" size={15} />
                      </div>
                      <div className="mbody">
                        <div className="mtxt">{m.content}</div>
                        <div className="mmeta">{new Date(m.updatedAt).toLocaleString()}</div>
                        <button
                          type="button"
                          className="btn sm"
                          style={{ marginTop: 8 }}
                          onClick={() => void onDelete(m.id)}
                        >
                          {t("memory.delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
