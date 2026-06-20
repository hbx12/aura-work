import { useState } from "react";
import { Icon } from "@aura-os/ui";
import type { MarketplaceEntry } from "@aura-os/shared";
import PermissionPreview from "./PermissionPreview";
import { localizedMarketplace } from "../../marketplace/localizeMarketplace";

interface MarketplaceDetailModalProps {
  item: MarketplaceEntry;
  installedStatus: "not_installed" | "installed" | "configured";
  onClose: () => void;
  onInstall: (item: MarketplaceEntry) => void;
  onConfigure?: (item: MarketplaceEntry) => void;
  onUninstall?: (item: MarketplaceEntry) => void;
  isAr?: boolean;
}

type TabType = "overview" | "setup" | "permissions" | "tools" | "publisher" | "changelog";

const tabs: TabType[] = ["overview", "setup", "permissions", "tools", "publisher", "changelog"];

function tabLabel(tab: TabType, isAr?: boolean) {
  const labels: Record<TabType, [string, string]> = {
    overview: ["Overview", "نظرة عامة"],
    setup: ["Setup", "الإعداد"],
    permissions: ["Permissions", "الصلاحيات"],
    tools: ["Tools", "الأدوات"],
    publisher: ["Publisher", "الناشر"],
    changelog: ["Changelog", "التغييرات"],
  };
  return isAr ? labels[tab][1] : labels[tab][0];
}

export default function MarketplaceDetailModal({
  item: rawItem,
  installedStatus,
  onClose,
  onInstall,
  onConfigure,
  onUninstall,
  isAr,
}: MarketplaceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const item = localizedMarketplace(rawItem, isAr);
  const isInstalled = installedStatus !== "not_installed";
  const coverStyle = item.cover
    ? { backgroundImage: `url(${item.cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(135deg, #18181b 0%, #ea580c 100%)" };
  const riskColor = item.risk === "high" ? "#ef4444" : item.risk === "medium" ? "#f59e0b" : "#10b981";

  const renderOverview = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h4 style={{ margin: "0 0 8px 0", color: "var(--fg-1)" }}>{isAr ? "الوصف الكامل" : "Full Description"}</h4>
        <p style={{ margin: 0, fontSize: 14, color: "var(--fg-2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
          {item.description || item.summary || (isAr ? "لا يوجد وصف متوفر." : "No description available.")}
        </p>
      </div>
      {item.categories && item.categories.length > 0 && (
        <div>
          <h4 style={{ margin: "0 0 8px 0", color: "var(--fg-1)" }}>{isAr ? "الفئات" : "Categories"}</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {item.categories.map((c) => (
              <span key={c} style={{ background: "var(--bg-3)", border: "1px solid var(--border-3)", padding: "4px 10px", borderRadius: 999, fontSize: 12, color: "var(--fg-2)" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSetup = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h4 style={{ margin: 0, color: "var(--fg-1)" }}>{isAr ? "خطوات الإعداد والتهيئة" : "Setup Instructions"}</h4>
      {item.setup && item.setup.length > 0 ? (
        <ol style={{ margin: 0, paddingLeft: isAr ? 0 : 20, paddingRight: isAr ? 20 : 0, color: "var(--fg-2)", lineHeight: 1.6, fontSize: 14 }}>
          {item.setup.map((step, idx) => <li key={idx} style={{ marginBottom: 8 }}>{step}</li>)}
        </ol>
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: "var(--fg-3)", fontStyle: "italic" }}>
          {isAr ? "لا توجد خطوات إعداد إضافية مطلوبة." : "No special setup steps required."}
        </p>
      )}
    </div>
  );

  const renderPermissions = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h4 style={{ margin: 0, color: "var(--fg-1)" }}>{isAr ? "الصلاحيات المطلوبة للتشغيل" : "Requested Permissions"}</h4>
      <p style={{ margin: 0, fontSize: 13, color: "var(--fg-3)" }}>
        {isAr ? "هذه الصلاحيات تساعد الوكيل على تنفيذ المهمة، وستظل عمليات الكتابة والأوامر الحساسة مرتبطة بالموافقة." : "These permissions help the agent do the work. Writes and sensitive actions remain approval-gated."}
      </p>
      <PermissionPreview permissions={item.permissions ?? []} isAr={isAr} />
    </div>
  );

  const renderTools = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h4 style={{ margin: 0, color: "var(--fg-1)" }}>{isAr ? "الأدوات والميزات المتوفرة" : "Provided Tools"}</h4>
      {item.tools && item.tools.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {item.tools.map((tool) => (
            <div key={tool.name} style={{ background: "var(--bg-3)", border: "1px solid var(--border-3)", padding: "10px 14px", borderRadius: 8 }}>
              <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>{tool.name}</div>
              {tool.description && <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4 }}>{tool.description}</div>}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "var(--fg-3)", fontStyle: "italic" }}>
          {isAr ? "لا يوفر هذا العنصر أدوات محددة." : "This item does not register specific tools."}
        </p>
      )}
    </div>
  );

  const renderPublisher = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h4 style={{ margin: 0, color: "var(--fg-1)" }}>{isAr ? "بيانات الناشر والمطور" : "Publisher Profile"}</h4>
      <div style={{ background: "var(--bg-3)", border: "1px solid var(--border-3)", padding: 16, borderRadius: 10, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", color: "#fff", fontSize: 20, fontWeight: 800 }}>
          {item.publisher?.name ? item.publisher.name.slice(0, 2).toUpperCase() : "??"}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "var(--fg-1)", fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
            {item.publisher?.name || "Anonymous Publisher"}
            {item.publisher?.verified && <Icon name="check-badge" size={16} style={{ color: "var(--accent)" }} />}
          </div>
          {item.publisher?.github && (
            <a href={`https://github.com/${item.publisher.github}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Icon name="github" size={13} /> github.com/{item.publisher.github}
            </a>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "setup": return renderSetup();
      case "permissions": return renderPermissions();
      case "tools": return renderTools();
      case "publisher": return renderPublisher();
      default:
        return (
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "var(--fg-2)", background: "var(--bg-3)", padding: 14, borderRadius: 8, border: "1px solid var(--border-3)" }}>
            <strong style={{ color: "var(--accent)" }}>v{item.version}</strong> — {isAr ? "إصدار Marketplace مخصص من HBX." : "HBX marketplace release."}
          </div>
        );
    }
  };

  return (
    <div className="modal-backdrop" style={{ alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="modal" style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflow: "hidden", background: "var(--bg-2)", border: "1px solid var(--border-2)", borderRadius: "var(--r-lg)", display: "flex", flexDirection: "column", textAlign: isAr ? "right" : "left" }}>
        <div style={{ height: 150, position: "relative", padding: 24, display: "flex", alignItems: "flex-end", ...coverStyle }}>
          <button type="button" onClick={onClose} style={{ position: "absolute", top: 14, right: isAr ? "auto" : 14, left: isAr ? 14 : "auto", background: "rgba(0,0,0,.48)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", borderRadius: "50%", width: 34, height: 34, cursor: "pointer" }}>
            <Icon name="x-mark" size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {item.icon && <img src={item.icon} alt={item.name} style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(0,0,0,.25)", border: "2px solid rgba(255,255,255,.22)", padding: 8 }} />}
            <div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 26 }}>{item.name}</h2>
              <div style={{ color: "rgba(255,255,255,.78)", fontSize: 13, marginTop: 4 }}>
                {item.publisher?.name || "HBX"} · <span style={{ color: riskColor }}>{item.risk ?? "low"} risk</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "12px 16px", borderBottom: "1px solid var(--border-2)", overflowX: "auto" }}>
          {tabs.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`btn sm ${activeTab === tab ? "primary" : "secondary"}`}>
              {tabLabel(tab, isAr)}
            </button>
          ))}
        </div>

        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>{renderContent()}</div>

        <div style={{ padding: 16, borderTop: "1px solid var(--border-2)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {isInstalled ? (
            <>
              {item.type === "mcp" && onConfigure && <button type="button" className="btn secondary" onClick={() => onConfigure(item)}>{isAr ? "إعداد" : "Configure"}</button>}
              {onUninstall && <button type="button" className="btn secondary" style={{ color: "var(--danger)" }} onClick={() => onUninstall(item)}>{isAr ? "إلغاء التثبيت" : "Uninstall"}</button>}
            </>
          ) : (
            <button type="button" className="btn primary" onClick={() => onInstall(item)}>
              <Icon name="plus" size={14} /> {isAr ? "تثبيت" : "Install"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
