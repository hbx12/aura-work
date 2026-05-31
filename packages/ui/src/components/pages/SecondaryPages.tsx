import { Icon } from "../Icon";

interface SimplePageProps {
  icon: string;
  title: string;
  desc: string;
}

export function SimplePage({ icon, title, desc }: SimplePageProps) {
  return (
    <div className="page">
      <div className="empty">
        <div className="em-ic">
          <Icon name={icon} size={26} />
        </div>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
    </div>
  );
}

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic", logo: "A", color: "#c2683f", sub: "Claude 3.5 / 3.7 · 4 models", tag: "ok", on: true, sel: true },
  { id: "openai", name: "OpenAI", logo: "O", color: "#1a7f64", sub: "GPT-4o / o-series · 6 models", tag: "ok", on: true },
  { id: "gemini", name: "Google Gemini", logo: "G", color: "#3a6fc4", sub: "1.5 Pro / Flash · 3 models", tag: "ok", on: true },
  { id: "deepseek", name: "DeepSeek", logo: "D", color: "#4b5bb0", sub: "V3 / R1 · 2 models", tag: "off", on: false },
  { id: "ollama", name: "Ollama", logo: "Ω", color: "#7a5c8e", sub: "llama3 · on-device, no key", tag: "local", on: true },
  { id: "custom", name: "Custom endpoint", logo: "{}", color: "#645d4e", sub: "OpenAI-compatible · base URL", tag: "off", on: false },
];

const ROUTES = [
  { id: "quality", t: "Quality-first", s: "Best model for the job. Default.", sel: true },
  { id: "cost", t: "Cost-first", s: "Cheapest model that can do the task." },
  { id: "privacy", t: "Privacy-first", s: "Prefer local; redact secrets before cloud." },
  { id: "local", t: "Local-only", s: "Ollama only. No cloud requests." },
];

export function ProvidersPage() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>AI providers</h1>
        <p>
          Bring your own keys. Keys are stored only in the local encrypted vault and never sync to Aura Cloud.
          (Phase 1: UI shell only — real provider calls in Phase 2.)
        </p>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          <div className="section">
            <span className="sec-label">Routing policy</span>
            <div className="routegrid">
              {ROUTES.map((r) => (
                <div key={r.id} className={`routecard${r.sel ? " sel" : ""}`}>
                  <span className="ro" />
                  <div>
                    <div className="rt">{r.t}</div>
                    <div className="rs">{r.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="section">
            <span className="sec-label">Providers</span>
            <div className="panel">
              {PROVIDERS.map((p) => (
                <div key={p.id} className="panel-row">
                  <div className="prov-logo" style={{ background: p.color }}>
                    {p.logo}
                  </div>
                  <div className="prov-meta">
                    <div className="prov-name">
                      {p.name}
                      {p.sel && <span className="tag ok">Active</span>}
                      {p.tag === "local" && <span className="tag local">Local</span>}
                    </div>
                    <div className="prov-sub">{p.sub}</div>
                  </div>
                  <div className={`toggle${p.on ? " on" : ""}`}>
                    <i />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const AUDIT = [
  { time: "14:32:08", cat: "file", icon: "file", sum: "Project folder opened", res: "ok" },
  { time: "14:28:30", cat: "permission", icon: "shield-check", sum: "Ask-first mode active", res: "ok" },
  { time: "14:27:05", cat: "provider", icon: "cpu", sum: "Provider settings viewed", res: "ok" },
];

export function AuditPage() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Audit log</h1>
        <p>Append-only record of every sensitive action. Full audit logging ships in Phase 3.</p>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          <div className="section">
            <span className="sec-label">Today</span>
            <div className="panel audit">
              {AUDIT.map((a, i) => (
                <div key={i} className="audit-row">
                  <span className="a-time">{a.time}</span>
                  <span className="a-cat">
                    <Icon name={a.icon} size={13} />
                    {a.cat}
                  </span>
                  <span className="a-sum">{a.sum}</span>
                  <span className="a-res">
                    <span className="res-pill ok">{a.res}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SCHED = [
  { name: "Weekly dependency audit", cad: "Weekly · Mon 09:00", next: "in 3d", on: true },
  { name: "Sync research notes → summary", cad: "Daily · 18:00", next: "in 5h", on: true },
];

export function SchedulePage() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Scheduled tasks</h1>
        <p>Scheduled task execution ships in Phase 8. This page shows the design shell.</p>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          <div className="section">
            <span className="sec-label">Schedules</span>
            <div className="panel">
              {SCHED.map((s, i) => (
                <div key={i} className="panel-row">
                  <div
                    className="prov-logo"
                    style={{
                      background: s.on ? "var(--accent)" : "var(--bg-3)",
                      color: s.on ? "#fff" : "var(--fg-3)",
                    }}
                  >
                    <Icon name="clock" size={17} />
                  </div>
                  <div className="prov-meta">
                    <div className="prov-name">{s.name}</div>
                    <div className="prov-sub">
                      {s.cad} · next {s.next}
                    </div>
                  </div>
                  <div className={`toggle${s.on ? " on" : ""}`}>
                    <i />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
