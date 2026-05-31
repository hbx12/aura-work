import type { AuditEntry } from "@aura-os/shared";
import { Icon } from "@aura-os/ui";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

function resultClass(result: string) {
  if (["succeeded", "allowed", "ok"].includes(result)) return "ok";
  if (["denied", "failed"].includes(result)) return "fail";
  return "warn";
}

interface AuditPageLiveProps {
  entries: AuditEntry[];
  loading: boolean;
}

export function AuditPageLive({ entries, loading }: AuditPageLiveProps) {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Audit log</h1>
        <p>Append-only record of file, permission, Git, and task actions.</p>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          {loading && <p>Loading audit log…</p>}
          <div className="section">
            <span className="sec-label">Recent entries</span>
            <div className="panel audit">
              {entries.length === 0 ? (
                <div className="audit-row">No audit entries yet.</div>
              ) : (
                entries.map((a) => (
                  <div key={a.id} className="audit-row">
                    <span className="a-time">{formatTime(a.createdAt)}</span>
                    <span className="a-cat">
                      <Icon name={a.category === "git" ? "git-branch" : a.category === "file" ? "file" : "shield-check"} size={13} />
                      {a.category}
                    </span>
                    <span className="a-sum">{a.summary}</span>
                    <span className="a-res">
                      <span className={`res-pill ${resultClass(a.result)}`}>{a.result}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
