import { useState } from "react";
import { Icon } from "@aura-os/ui";
import type { MarketplaceEntry } from "@aura-os/shared";
import PermissionPreview from "./PermissionPreview";

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

export default function MarketplaceDetailModal({
  item,
  installedStatus,
  onClose,
  onInstall,
  onConfigure,
  onUninstall,
  isAr,
}: MarketplaceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const isInstalled = installedStatus !== "not_installed";

  const getCoverStyle = () => {
    if (item.cover) {
      return {
        backgroundImage: `url(${item.cover})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    switch (item.type) {
      case "skill":
        return { background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)" };
      case "mcp":
        return { background: "linear-gradient(135deg, #065f46 0%, #10b981 100%)" };
      case "plugin":
        return { background: "linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)" };
      default:
        return { background: "linear-gradient(135deg, #374151 0%, #4b5563 100%)" };
    }
  };

  const getRiskColor = (risk?: string | null) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
      default:
        return "#10b981";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h4 style={{ margin: "0 0 8px 0", color: "var(--fg-1)" }}>
                {isAr ? "الوصف الكامل" : "Full Description"}
              </h4>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--fg-2)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {item.description || item.summary || (isAr ? "لا يوجد وصف متوفر." : "No description available.")}
              </p>
            </div>
            {item.categories && item.categories.length > 0 && (
              <div>
                <h4 style={{ margin: "0 0 8px 0", color: "var(--fg-1)" }}>
                  {isAr ? "الفئات" : "Categories"}
                </h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {item.categories.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        background: "var(--bg-3)",
                        border: "1px solid var(--border-3)",
                        padding: "4px 10px",
                        borderRadius: "16px",
                        fontSize: "12px",
                        color: "var(--fg-2)",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "setup":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h4 style={{ margin: 0, color: "var(--fg-1)" }}>{isAr ? "خطوات الإعداد والتهيئة" : "Setup Instructions"}</h4>
            {item.setup && item.setup.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: isAr ? 0 : 20, paddingRight: isAr ? 20 : 0, color: "var(--fg-2)", lineHeight: "1.6", fontSize: "14px" }}>
                {item.setup.map((step, idx) => (
                  <li key={idx} style={{ marginBottom: 8 }}>{step}</li>
                ))}
              </ol>
            ) : (
              <p style={{ margin: 0, fontSize: "14px", color: "var(--fg-3)", fontStyle: "italic" }}>
                {isAr ? "لا توجد خطوات إعداد إضافية مطلوبة." : "No special setup steps required."}
              </p>
            )}

            {item.auth && item.auth.fields && item.auth.fields.length > 0 && (
              <div style={{ background: "rgba(234, 88, 12, 0.04)", border: "1px solid rgba(234, 88, 12, 0.15)", borderRadius: 6, padding: 12, marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--accent)" }}>
                  <Icon name="key" size={14} />
                  <span style={{ fontWeight: 600, fontSize: "13px" }}>{isAr ? "الحقول الأمنية المطلوبة:" : "Required Security Fields:"}</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--fg-2)" }}>
                  {item.auth.fields.map((f, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <span style={{ fontWeight: 600 }}>{f.label}:</span>
                      <span>({f.required ? (isAr ? "إجباري" : "Required") : (isAr ? "اختياري" : "Optional")})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "permissions":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: 0, color: "var(--fg-1)" }}>
              {isAr ? "الصلاحيات المطلوبة للتشغيل" : "Requested Permissions"}
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--fg-3)" }}>
              {isAr
                ? "يطلب هذا العنصر الصلاحيات التالية للعمل والتفاعل مع نظام التشغيل والشبكة:"
                : "This item requests the following permissions to interact with the workspace and network:"}
            </p>
            <div style={{ marginTop: 6 }}>
              <PermissionPreview permissions={item.permissions ?? []} isAr={isAr} />
            </div>
          </div>
        );

      case "tools":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: 0, color: "var(--fg-1)" }}>
              {isAr ? "الأدوات والميزات المتوفرة للوكيل" : "Provided Tools"}
            </h4>
            {item.tools && item.tools.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {item.tools.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--bg-3)",
                      border: "1px solid var(--border-3)",
                      padding: "10px 14px",
                      borderRadius: "6px",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--accent)", fontSize: "14px", fontFamily: "monospace" }}>
                      {t.name}
                    </div>
                    {t.description && (
                      <div style={{ fontSize: "12px", color: "var(--fg-2)", marginTop: 4 }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", color: "var(--fg-3)", fontStyle: "italic" }}>
                {isAr ? "لا يوفر هذا الملحق أدوات محددة للوكيل." : "This item does not register specific tools."}
              </p>
            )}
          </div>
        );

      case "publisher":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: 0, color: "var(--fg-1)" }}>{isAr ? "بيانات الناشر والمطور" : "Publisher Profile"}</h4>
            <div
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--border-3)",
                padding: "16px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {item.publisher?.name ? item.publisher.name.slice(0, 2).toUpperCase() : "??"}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "var(--fg-1)", fontSize: "16px", display: "flex", alignItems: "center", gap: 6 }}>
                  {item.publisher?.name || "Anonymous Publisher"}
                  {item.publisher?.verified && (
                    <span title={isAr ? "ناشر موثق" : "Verified Publisher"} style={{ display: "inline-flex" }}>
                      <Icon name="check-badge" size={16} style={{ color: "var(--accent)" }} />
                    </span>
                  )}
                </div>
                {item.publisher?.github && (
                  <a
                    href={`https://github.com/${item.publisher.github}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "13px", color: "var(--accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}
                  >
                    <Icon name="github" size={13} />
                    github.com/{item.publisher.github}
                  </a>
                )}
              </div>
            </div>
          </div>
        );

      case "changelog":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: 0, color: "var(--fg-1)" }}>{isAr ? "سجل التغييرات والتحديثات" : "Changelog"}</h4>
            <div style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--fg-2)", background: "var(--bg-3)", padding: 14, borderRadius: 6, border: "1px solid var(--border-3)" }}>
              <div style={{ fontWeight: 600, color: "var(--accent)", marginBottom: 6 }}>
                v{item.version} - Released
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: "1.6" }}>
                <li>{isAr ? "الإصدار الأولي في Aura OS Marketplace." : "Initial release inside Aura OS Marketplace."}</li>
                <li>{isAr ? "توفير ميزات الحماية والتوافقية والأدوات المناسبة للوكيل." : "Ensured security controls and agent compatibility bindings."}</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const tabs: { key: TabType; labelEn: string; labelAr: string; icon: string }[] = [
    { key: "overview", labelEn: "Overview", labelAr: "نظرة عامة", icon: "document-text" },
    { key: "setup", labelEn: "Setup", labelAr: "الإعداد", icon: "cog" },
    { key: "permissions", labelEn: "Permissions", labelAr: "الصلاحيات", icon: "shield" },
    { key: "tools", labelEn: "Tools", labelAr: "الأدوات", icon: "wrench" },
    { key: "publisher", labelEn: "Publisher", labelAr: "الناشر", icon: "user" },
    { key: "changelog", labelEn: "Changelog", labelAr: "التغييرات", icon: "clock" },
  ];

  return (
    <div className="modal-backdrop" style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        className="modal"
        style={{
          width: "min(680px, 100%)",
          maxHeight: "90vh",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--r-lg)",
        }}
      >
        {/* Cover Header */}
        <div style={{ height: "130px", position: "relative", ...getCoverStyle() }}>
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: isAr ? "auto" : 16,
              left: isAr ? 16 : "auto",
              background: "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              zIndex: 10,
              backdropFilter: "blur(4px)",
            }}
          >
            <Icon name="x-mark" size={16} />
          </button>

          {/* Details Overlay on Cover */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
              padding: "16px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: isAr ? "right" : "left", flexDirection: isAr ? "row-reverse" : "row" }}>
              {item.icon && (
                <img
                  src={item.icon}
                  alt={item.name}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    background: "var(--bg-1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    padding: 4,
                  }}
                />
              )}
              <div>
                <h2 style={{ margin: 0, color: "#fff", fontSize: "22px", display: "flex", alignItems: "center", gap: 8, flexDirection: isAr ? "row-reverse" : "row" }}>
                  {item.name}
                  {item.publisher?.verified && (
                    <span title={isAr ? "ناشر موثق" : "Verified Publisher"} style={{ display: "inline-flex" }}>
                      <Icon name="check-badge" size={18} style={{ color: "var(--accent)" }} />
                    </span>
                  )}
                </h2>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", marginTop: 4 }}>
                  {isAr ? "نسخة " : "Version "} {item.version} | {isAr ? "بواسطة " : "by "} {item.publisher?.name || "Anonymous"}
                </div>
              </div>
            </div>
            {item.risk && (
              <span
                style={{
                  background: "rgba(0,0,0,0.6)",
                  border: `1px solid ${getRiskColor(item.risk)}`,
                  color: getRiskColor(item.risk),
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "12px",
                  textTransform: "capitalize",
                }}
              >
                {isAr ? `خطورة: ${item.risk === "high" ? "عالية" : item.risk === "medium" ? "متوسطة" : "منخفضة"}` : `${item.risk} Risk`}
              </span>
            )}
          </div>
        </div>

        {/* Tab List */}
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            borderBottom: "1px solid var(--border-3)",
            background: "var(--bg-3)",
            padding: "0 16px",
            gap: 16,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "none",
                border: "none",
                padding: "14px 4px",
                borderBottom: `2px solid ${activeTab === tab.key ? "var(--accent)" : "transparent"}`,
                color: activeTab === tab.key ? "var(--fg-1)" : "var(--fg-3)",
                fontSize: "13px",
                fontWeight: activeTab === tab.key ? 600 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name={tab.icon} size={14} />
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Scrollable Content Pane */}
        <div style={{ flexGrow: 1, overflowY: "auto", padding: "20px", maxHeight: "400px" }}>
          {renderTabContent()}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-3)",
          }}
        >
          {/* Left: Links if available */}
          <div style={{ display: "flex", gap: 12 }}>
            {item.repository && (
              <a
                href={item.repository}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--fg-2)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "13px",
                }}
              >
                <Icon name="github" size={14} />
                <span>{isAr ? "مستودع الكود" : "Repository"}</span>
              </a>
            )}
            {item.homepage && (
              <a
                href={item.homepage}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--fg-2)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "13px",
                }}
              >
                <Icon name="globe-alt" size={14} />
                <span>{isAr ? "الموقع الرسمي" : "Website"}</span>
              </a>
            )}
          </div>

          {/* Right: Install/Uninstall */}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn secondary sm" onClick={onClose}>
              {isAr ? "إغلاق" : "Close"}
            </button>

            {isInstalled ? (
              <div style={{ display: "flex", gap: 6 }}>
                {item.type === "mcp" && onConfigure && (
                  <button
                    type="button"
                    className="btn secondary sm"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                    onClick={() => {
                      onClose();
                      onConfigure(item);
                    }}
                  >
                    <Icon name="cog" size={14} />
                    {isAr ? "تهيئة" : "Configure"}
                  </button>
                )}
                {onUninstall && (
                  <button
                    type="button"
                    className="btn secondary sm"
                    style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)" }}
                    onClick={() => {
                      onClose();
                      onUninstall(item);
                    }}
                  >
                    <Icon name="trash" size={14} />
                    {isAr ? "إلغاء التثبيت" : "Uninstall"}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  onClose();
                  onInstall(item);
                }}
              >
                <Icon name="plus" size={14} />
                {isAr ? "تثبيت الملحق" : "Install Marketplace Item"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
