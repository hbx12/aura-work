import { Icon } from "@aura-os/ui";
import type { MarketplaceEntry } from "@aura-os/shared";
import { localizedMarketplace } from "../../marketplace/localizeMarketplace";

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
  const displayItem = localizedMarketplace(item, isAr);
  const isInstalled = installedStatus !== "not_installed";
  const displayPublisher = getDisplayPublisher(displayItem);
  const description = displayItem.summary || displayItem.description || "";
  const isDescEng = isEnglishText(description);

  const coverStyle = displayItem.cover
    ? { backgroundImage: `url(${displayItem.cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(135deg, #18181b 0%, #ea580c 100%)" };

  const riskColor = displayItem.risk === "high" ? "var(--danger, #ef4444)" : displayItem.risk === "medium" ? "var(--warning, #f59e0b)" : "var(--success, #10b981)";

  const typeLabel =
    displayItem.type === "skill"
      ? isAr ? "مهارة" : "Skill"
      : displayItem.type === "mcp"
        ? isAr ? "موصل MCP" : "MCP Connector"
        : isAr ? "إضافة Aura" : "Aura Plugin";

  return (
    <div
      className="marketplace-card"
      style={{
        background: "var(--bg-2, #1c1917)",
        border: "1px solid var(--border-2, #2e2a24)",
        borderRadius: "var(--r-md, 12px)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          height: "96px",
          position: "relative",
          padding: "12px",
          ...coverStyle,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 10,
            left: isAr ? "auto" : 10,
            right: isAr ? 10 : "auto",
            background: "rgba(0,0,0,.65)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.16)",
          }}
        >
          {typeLabel}
        </span>
        {displayItem.risk && (
          <span
            style={{
              position: "absolute",
              top: 10,
              right: isAr ? "auto" : 10,
              left: isAr ? 10 : "auto",
              background: "rgba(0,0,0,.65)",
              color: riskColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 999,
              border: `1px solid ${riskColor}`,
              textTransform: "capitalize",
            }}
          >
            {isAr ? `خطورة: ${displayItem.risk === "high" ? "عالية" : displayItem.risk === "medium" ? "متوسطة" : "منخفضة"}` : `${displayItem.risk} Risk`}
          </span>
        )}
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", flexGrow: 1, gap: 10, textAlign: isAr ? "right" : "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 24, marginBottom: 4 }}>
          {displayItem.icon ? (
            <img
              src={displayItem.icon}
              alt={displayItem.name}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                border: "2px solid var(--border-2, #2e2a24)",
                background: "var(--bg-1, #131010)",
                padding: 6,
                marginTop: -40,
                boxShadow: "0 4px 12px rgba(0,0,0,.5)",
                objectFit: "cover",
              }}
            />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg-1)", display: "grid", placeItems: "center", marginTop: -40 }}>
              <Icon name="puzzle" size={22} />
            </div>
          )}
          <span style={{ fontSize: 11, background: "var(--bg-3)", border: "1px solid var(--border-3)", padding: "2px 6px", borderRadius: 4, color: "var(--fg-2)", fontWeight: 600 }}>
            v{displayItem.version}
          </span>
        </div>

        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--fg-1)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {displayItem.name}
            {displayPublisher?.verified && (
              <span title={isAr ? "ناشر موثق" : "Verified Publisher"} style={{ display: "inline-flex" }}>
                <Icon name="check-badge" size={15} style={{ color: "var(--accent, #ea580c)" }} />
              </span>
            )}
          </h3>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
            {isAr ? "بواسطة " : "by "}{displayPublisher?.name || "Anonymous"}
          </span>
        </div>

        <p
          dir={isDescEng ? "ltr" : "rtl"}
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--fg-2)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flexGrow: 1,
            minHeight: 38,
            textAlign: isDescEng ? "left" : "right",
          }}
        >
          {description}
        </p>

        {displayItem.tags && displayItem.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: isAr ? "flex-end" : "flex-start" }}>
            {displayItem.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontSize: 11, background: "rgba(234,88,12,.08)", border: "1px solid rgba(234,88,12,.2)", color: "var(--accent)", padding: "1px 6px", borderRadius: 4 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-3)" }}>
          <button type="button" className="btn secondary sm" style={{ flex: 1 }} onClick={() => onOpenDetails(displayItem)}>
            {isAr ? "التفاصيل" : "Details"}
          </button>

          {isInstalled ? (
            <div style={{ display: "flex", gap: 6, flex: 1.5 }}>
              {displayItem.type === "mcp" && onConfigure && (
                <button type="button" className="btn secondary sm" style={{ flex: 1, borderColor: "var(--accent)", color: "var(--accent)" }} onClick={() => onConfigure(displayItem)}>
                  <Icon name="cog" size={13} />
                </button>
              )}
              {onUninstall && (
                <button type="button" className="btn secondary sm" style={{ flex: 1, color: "var(--danger)", borderColor: "rgba(239,68,68,.2)" }} onClick={() => onUninstall(displayItem)} title={isAr ? "إلغاء التثبيت" : "Uninstall"}>
                  <Icon name="trash" size={13} />
                </button>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--success)", padding: "0 8px", flex: 2 }}>
                <Icon name="check" size={14} />
                {isAr ? "مثبت" : "Installed"}
              </span>
            </div>
          ) : (
            <button type="button" className="btn primary sm" style={{ flex: 1.5 }} onClick={() => onInstall(displayItem)}>
              <Icon name="plus" size={13} />
              {isAr ? "تثبيت" : "Install"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
