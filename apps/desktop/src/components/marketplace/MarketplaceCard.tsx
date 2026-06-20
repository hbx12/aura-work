import { Icon } from "@aura-os/ui";
import type { MarketplaceEntry } from "@aura-os/shared";

interface MarketplaceCardProps {
  item: MarketplaceEntry;
  installedStatus: "not_installed" | "installed" | "configured";
  onInstall: (item: MarketplaceEntry) => void;
  onConfigure?: (item: MarketplaceEntry) => void;
  onUninstall?: (item: MarketplaceEntry) => void;
  onOpenDetails: (item: MarketplaceEntry) => void;
  isAr?: boolean;
}

const isEnglishText = (text?: string | null) => {
  if (!text) return false;
  const first = text.trim().charCodeAt(0);
  return first > 0 && first < 128;
};

const legacyPublisherName = ["Aura", "Community"].join(" ");
const legacyPublisherHandle = ["aura", "os"].join("-");

function getDisplayPublisher(item: MarketplaceEntry) {
  if (item.publisher?.name === legacyPublisherName || item.publisher?.github === legacyPublisherHandle) {
    return {
      ...item.publisher,
      name: "HBX",
      github: "hbx12",
      verified: true,
    };
  }

  return item.publisher;
}

export default function MarketplaceCard({
  item,
  installedStatus,
  onInstall,
  onConfigure,
  onUninstall,
  onOpenDetails,
  isAr,
}: MarketplaceCardProps) {
  const isInstalled = installedStatus !== "not_installed";
  const displayPublisher = getDisplayPublisher(item);

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
        return { background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)" };
      case "mcp":
        return { background: "linear-gradient(135deg, #047857 0%, #10b981 100%)" };
      case "plugin":
        return { background: "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)" };
      default:
        return { background: "linear-gradient(135deg, #4b5563 0%, #6b7280 100%)" };
    }
  };

  const getRiskColor = (risk?: string | null) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "var(--danger, #ef4444)";
      case "medium":
        return "var(--warning, #f59e0b)";
      case "low":
      default:
        return "var(--success, #10b981)";
    }
  };

  const getTypeLabel = () => {
    switch (item.type) {
      case "skill":
        return isAr ? "مهارة" : "Skill";
      case "mcp":
        return isAr ? "موصل MCP" : "MCP Connector";
      case "plugin":
        return isAr ? "إضافة Aura" : "Aura Plugin";
      default:
        return item.type;
    }
  };

  const description = item.summary || item.description || "";
  const isDescEng = isEnglishText(description);

  return (
    <div
      style={{
        background: "var(--bg-2, #1c1917)",
        border: "1px solid var(--border-2, #2e2a24)",
        borderRadius: "var(--r-md, 12px)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
      }}
      className="marketplace-card"
    >
      <div
        style={{
          height: "95px",
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          padding: "12px",
          ...getCoverStyle(),
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "10px",
            left: isAr ? "auto" : "10px",
            right: isAr ? "10px" : "auto",
            background: "rgba(0, 0, 0, 0.65)",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: "10px",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          {getTypeLabel()}
        </span>

        {item.risk && (
          <span
            style={{
              position: "absolute",
              top: "10px",
              right: isAr ? "auto" : "10px",
              left: isAr ? "10px" : "auto",
              background: "rgba(0, 0, 0, 0.65)",
              color: getRiskColor(item.risk),
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "10px",
              backdropFilter: "blur(4px)",
              border: `1px solid ${getRiskColor(item.risk)}`,
              textTransform: "capitalize",
            }}
          >
            {isAr ? `خطورة: ${item.risk === "high" ? "عالية" : item.risk === "medium" ? "متوسطة" : "منخفضة"}` : `${item.risk} Risk`}
          </span>
        )}
      </div>

      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          gap: "10px",
          textAlign: isAr ? "right" : "left",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "24px", marginBottom: "4px" }}>
          {item.icon ? (
            <img
              src={item.icon}
              alt={item.name}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "8px",
                border: "2px solid var(--border-2, #2e2a24)",
                background: "var(--bg-1, #131010)",
                padding: "6px",
                marginTop: "-40px",
                zIndex: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              }}
            />
          ) : (
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "8px",
                border: "2px solid var(--border-2, #2e2a24)",
                background: "var(--bg-1, #131010)",
                display: "grid",
                placeItems: "center",
                color: "var(--accent)",
                marginTop: "-40px",
                zIndex: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              <Icon name="puzzle" size={22} />
            </div>
          )}

          <span
            style={{
              fontSize: "11px",
              background: "var(--bg-3, #292524)",
              border: "1px solid var(--border-3, #3f3f46)",
              padding: "2px 6px",
              borderRadius: "4px",
              color: "var(--fg-2, #e7e5e4)",
              fontWeight: 500,
            }}
          >
            v{item.version}
          </span>
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--fg-1, #f5f5f4)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {item.name}
            {displayPublisher?.verified && (
              <span title={isAr ? "ناشر موثق" : "Verified Publisher"} style={{ display: "inline-flex" }}>
                <Icon name="check-badge" size={15} style={{ color: "var(--accent, #ea580c)" }} />
              </span>
            )}
          </h3>
          <span style={{ fontSize: "12px", color: "var(--fg-3, #a8a29e)" }}>
            {isAr ? "بواسطة " : "by "}
            {displayPublisher?.name || "Anonymous"}
          </span>
        </div>

        <p
          dir={isDescEng ? "ltr" : "rtl"}
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--fg-2, #d6d3d1)",
            lineHeight: "1.5",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flexGrow: 1,
            minHeight: "38px",
            textAlign: isDescEng ? "left" : "right",
          }}
        >
          {description}
        </p>

        {item.tags && item.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              marginTop: "4px",
              justifyContent: isAr ? "flex-end" : "flex-start",
            }}
          >
            {item.tags.slice(0, 3).map((tag, idx) => {
              const isTagEng = isEnglishText(tag);
              return (
                <span
                  key={idx}
                  dir={isTagEng ? "ltr" : "rtl"}
                  style={{
                    fontSize: "11px",
                    background: "rgba(234, 88, 12, 0.08)",
                    border: "1px solid rgba(234, 88, 12, 0.2)",
                    color: "var(--accent, #ea580c)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    direction: isTagEng ? "ltr" : "rtl",
                  }}
                >
                  #{tag}
                </span>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-3, #2e2a24)",
          }}
        >
          <button
            type="button"
            className="btn secondary sm"
            style={{ flex: 1 }}
            onClick={() => onOpenDetails(item)}
          >
            {isAr ? "التفاصيل" : "Details"}
          </button>

          {isInstalled ? (
            <div style={{ display: "flex", gap: "6px", flex: 1.5 }}>
              {item.type === "mcp" && onConfigure && (
                <button
                  type="button"
                  className="btn secondary sm"
                  style={{ flex: 1, borderColor: "var(--accent, #ea580c)", color: "var(--accent, #ea580c)" }}
                  onClick={() => onConfigure(item)}
                >
                  <Icon name="cog" size={13} />
                </button>
              )}
              {onUninstall && (
                <button
                  type="button"
                  className="btn secondary sm"
                  style={{ flex: 1, color: "var(--danger, #ef4444)", borderColor: "rgba(239, 68, 68, 0.2)" }}
                  onClick={() => onUninstall(item)}
                  title={isAr ? "إلغاء التثبيت" : "Uninstall"}
                >
                  <Icon name="trash" size={13} />
                </button>
              )}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--success, #10b981)",
                  padding: "0 8px",
                  flex: 2,
                  textAlign: "center",
                }}
              >
                <Icon name="check" size={14} />
                {isAr ? "مثبت" : "Installed"}
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="btn primary sm"
              style={{ flex: 1.5 }}
              onClick={() => onInstall(item)}
            >
              <Icon name="plus" size={13} />
              {isAr ? "تثبيت" : "Install"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
