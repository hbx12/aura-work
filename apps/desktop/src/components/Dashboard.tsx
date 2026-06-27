import { Icon } from "@aura-os/ui";
import type { TaskUsageRecord } from "../hooks/useAgent";
import type { GitStatusResult } from "@aura-os/shared";

interface DashboardProps {
  projectName: string;
  projectPath: string;
  gitStatus: GitStatusResult | null;
  lastUsage: TaskUsageRecord | null;
  filesCount: number;
  onNewTask: () => void;
  onNavigate: (view: string) => void;
  isArabic: boolean;
  t: (key: string, params?: Record<string, string>) => string;
}

export function Dashboard({
  projectName,
  projectPath,
  gitStatus,
  lastUsage,
  filesCount,
  onNewTask,
  onNavigate,
  isArabic,
  t: _t,
}: DashboardProps) {
  const branch = gitStatus?.branch || (isArabic ? "غير معروف" : "unknown");

  // Format LLM Cost
  const inTokens = lastUsage?.inputTokens ?? 0;
  const outTokens = lastUsage?.outputTokens ?? 0;
  const totalTokens = inTokens + outTokens;
  const cost = lastUsage?.estimatedCostUsd ?? 0;
  const costText = cost > 0 ? `$${cost.toFixed(4)}` : "BYOK";

  return (
    <div className="dashboard-root" style={{
      padding: "32px",
      display: "flex",
      flexDirection: "column",
      gap: "28px",
      height: "100%",
      overflowY: "auto",
      fontFamily: isArabic ? "Cairo, sans-serif" : "inherit"
    }}>
      {/* Welcome Header */}
      <div className="dash-welcome" style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}>
        <h1 style={{
          fontSize: "2.2rem",
          fontWeight: 700,
          background: "linear-gradient(135deg, var(--accent) 0%, #ff8c00 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0
        }}>
          {isArabic ? `مرحباً بك في ${projectName}` : `Welcome to ${projectName}`}
        </h1>
        <p style={{ color: "var(--fg-3)", fontSize: "0.95rem", margin: 0 }}>
          {isArabic ? "مساحة العمل الذكية جاهزة لمساعدتك في إنجاز مهامك." : "Your workspace agent is ready to assist you."}
        </p>
      </div>

      {/* Grid of Cards */}
      <div className="dash-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px"
      }}>
        {/* Project Card */}
        <div className="dash-card glass" style={{
          background: "rgba(255, 255, 255, 0.02)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "16px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              background: "rgba(10, 132, 255, 0.15)",
              color: "rgb(10, 132, 255)",
              borderRadius: "10px",
              padding: "8px",
              display: "flex"
            }}>
              <Icon name="folder" size={20} />
            </span>
            <h3 style={{ margin: 0, color: "var(--fg-1)" }}>
              {isArabic ? "مساحة العمل" : "Workspace"}
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--fg-3)" }}>{isArabic ? "المسار:" : "Path:"}</span>
              <span className="text-ellipsis" style={{ color: "var(--fg-2)", maxWidth: "160px" }} title={projectPath}>
                {projectPath}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--fg-3)" }}>{isArabic ? "الملفات:" : "Files:"}</span>
              <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{filesCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--fg-3)" }}>{isArabic ? "فرع Git:" : "Git Branch:"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent)" }}>
                <Icon name="git-branch" size={12} />
                {branch}
              </span>
            </div>
          </div>
        </div>

        {/* AI Resource Card */}
        <div className="dash-card glass" style={{
          background: "rgba(255, 255, 255, 0.02)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "16px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              background: "rgba(48, 209, 88, 0.15)",
              color: "rgb(48, 209, 88)",
              borderRadius: "10px",
              padding: "8px",
              display: "flex"
            }}>
              <Icon name="brain" size={20} />
            </span>
            <h3 style={{ margin: 0, color: "var(--fg-1)" }}>
              {isArabic ? "استهلاك الذكاء" : "AI Spending"}
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--fg-3)" }}>{isArabic ? "النموذج:" : "Model:"}</span>
              <span style={{ color: "var(--fg-2)" }}>{lastUsage ? `${lastUsage.providerId}/${lastUsage.modelId}` : "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--fg-3)" }}>{isArabic ? "الرموز المستخدمة:" : "Total Tokens:"}</span>
              <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{totalTokens.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--fg-3)" }}>{isArabic ? "التكلفة التقريبية:" : "Estimated Cost:"}</span>
              <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{costText}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="dash-card glass" style={{
          background: "rgba(255, 255, 255, 0.02)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "16px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}>
          <h3 style={{ margin: 0, color: "var(--fg-1)", fontSize: "1.1rem" }}>
            {isArabic ? "إجراءات سريعة" : "Quick Actions"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={onNewTask}
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, #ff8c00 100%)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                padding: "10px 14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "opacity 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span>⚡</span>
              {isArabic ? "بدء مهمة جديدة" : "Start New Task"}
            </button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => onNavigate("git")}
                style={{
                  flex: 1,
                  background: "var(--bg-1)",
                  border: "1px solid var(--border-3)",
                  borderRadius: "8px",
                  color: "var(--fg-2)",
                  padding: "8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "var(--bg-1)")}
              >
                {isArabic ? "حالة Git" : "Git Status"}
              </button>
              <button
                onClick={() => onNavigate("settings")}
                style={{
                  flex: 1,
                  background: "var(--bg-1)",
                  border: "1px solid var(--border-3)",
                  borderRadius: "8px",
                  color: "var(--fg-2)",
                  padding: "8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "var(--bg-1)")}
              >
                {isArabic ? "الإعدادات" : "Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics / Charts */}
      <div className="dash-analytics glass" style={{
        background: "rgba(255, 255, 255, 0.01)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "16px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        <h3 style={{ margin: 0, color: "var(--fg-1)" }}>
          {isArabic ? "نشاط المطور الافتراضي" : "Agent Activity & Usage Overview"}
        </h3>
        
        {/* SVG Usage Chart */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "150px",
          background: "var(--bg-1)",
          borderRadius: "12px",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Decorative Grid Lines */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }} />
          
          <svg width="100%" height="100%" style={{ position: "relative", zIndex: 1, padding: "20px" }}>
            <defs>
              <linearGradient id="gradient-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 50 110 Q 150 40 250 80 T 450 30 T 650 90 L 650 130 L 50 130 Z"
              fill="url(#gradient-glow)"
            />
            <path
              d="M 50 110 Q 150 40 250 80 T 450 30 T 650 90"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="450" cy="30" r="5" fill="var(--accent)" />
            <circle cx="250" cy="80" r="4" fill="var(--accent)" />
            <circle cx="650" cy="90" r="4" fill="var(--accent)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
