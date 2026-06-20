import { useState, useMemo } from "react";
import { Icon } from "@aura-os/ui";
import type { MarketplaceEntry, InstalledPlugin, McpServerRecord } from "@aura-os/shared";
import MarketplaceCard from "./MarketplaceCard";
import MarketplaceDetailModal from "./MarketplaceDetailModal";
import InstallFlowModal from "./InstallFlowModal";
import { invoke } from "@tauri-apps/api/core";
import "./marketplace.css";

interface MarketplaceGridProps {
  marketplace: MarketplaceEntry[];
  plugins: InstalledPlugin[];
  mcpServers: McpServerRecord[];
  skills: any[];
  loading?: boolean;
  isAr?: boolean;
  onRefresh: () => void;
}

export default function MarketplaceGrid({
  marketplace,
  plugins,
  mcpServers,
  skills,
  loading,
  isAr,
  onRefresh,
}: MarketplaceGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "skill" | "mcp" | "plugin" | "installed">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modals state
  const [selectedDetailItem, setSelectedDetailItem] = useState<MarketplaceEntry | null>(null);
  const [selectedInstallItem, setSelectedInstallItem] = useState<MarketplaceEntry | null>(null);

  // Determine installation status of each item
  const getItemInstalledStatus = (item: MarketplaceEntry): "not_installed" | "installed" | "configured" => {
    if (item.type === "skill") {
      const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const expectedId = `com.aura.skill.${slug}`;
      const isInst = skills.some(
        (s) =>
          s.pluginId === expectedId ||
          s.name.toLowerCase() === item.name.toLowerCase()
      );
      return isInst ? "installed" : "not_installed";
    }

    if (item.type === "mcp") {
      const server = mcpServers.find(
        (s) => s.id === item.id || s.name.toLowerCase() === item.name.toLowerCase()
      );
      if (!server) return "not_installed";
      // If server is found, check if credentials (if required) exist
      if (item.auth?.fields) {
        const hasSecretField = item.auth.fields.some((f) => f.secret);
        if (hasSecretField) {
          // If we have vault configured or enabled, we consider configured
          return "configured";
        }
      }
      return "installed";
    }

    if (item.type === "plugin") {
      const isInst = plugins.some(
        (p) => p.id === item.id || p.name.toLowerCase() === item.name.toLowerCase()
      );
      return isInst ? "installed" : "not_installed";
    }

    return "not_installed";
  };

  // Derive unique categories from all marketplace entries
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    marketplace.forEach((item) => {
      if (item.categories) {
        item.categories.forEach((c) => cats.add(c));
      }
    });
    return Array.from(cats);
  }, [marketplace]);

  // Filter items based on activeTab, category, and search query
  const filteredItems = useMemo(() => {
    return marketplace.filter((item) => {
      // 1. Filter by Tab
      if (activeTab === "installed") {
        if (getItemInstalledStatus(item) === "not_installed") return false;
      } else if (activeTab !== "all") {
        if (item.type !== activeTab) return false;
      }

      // 2. Filter by Category
      if (selectedCategory && (!item.categories || !item.categories.includes(selectedCategory))) {
        return false;
      }

      // 3. Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = (item.description || "").toLowerCase().includes(q);
        const summaryMatch = (item.summary || "").toLowerCase().includes(q);
        const tagMatch = item.tags && item.tags.some((t) => t.toLowerCase().includes(q));
        if (!nameMatch && !descMatch && !summaryMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [marketplace, activeTab, selectedCategory, searchQuery, plugins, mcpServers, skills]);

  const handleUninstall = async (item: MarketplaceEntry) => {
    if (!window.confirm(isAr ? `هل أنت متأكد من رغبتك في إزالة ${item.name}؟` : `Are you sure you want to uninstall ${item.name}?`)) {
      return;
    }
    try {
      if (item.type === "skill") {
        // Find local skill matching name
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const expectedId = `com.aura.skill.${slug}`;
        const found = skills.find((s) => s.pluginId === expectedId);
        if (found) {
          await invoke("uninstall_plugin", { pluginId: found.pluginId });
        }
      } else if (item.type === "mcp") {
        const server = mcpServers.find(
          (s) => s.id === item.id || s.name.toLowerCase() === item.name.toLowerCase()
        );
        if (server) {
          await invoke("delete_mcp_server", { serverId: server.id });
          // Clear secret from vault if it exists
          await invoke("clear_provider_secret", { providerId: server.id }).catch(() => {});
        }
      } else if (item.type === "plugin") {
        const p = plugins.find(
          (pl) => pl.id === item.id || pl.name.toLowerCase() === item.name.toLowerCase()
        );
        if (p) {
          await invoke("uninstall_plugin", { pluginId: p.id });
        }
      }
      onRefresh();
    } catch (e) {
      alert(isAr ? `فشل إلغاء التثبيت: ${e}` : `Failed to uninstall: ${e}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Search & Tabs Header Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          background: "var(--bg-3, #292524)",
          padding: "16px",
          borderRadius: "var(--r-md, 10px)",
          border: "1px solid var(--border-3, #2e2a24)",
        }}
      >
        {/* Left: Tab Selectors */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["all", "skill", "mcp", "plugin", "installed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn sm ${activeTab === tab ? "primary" : "secondary"}`}
              onClick={() => {
                setActiveTab(tab);
                setSelectedCategory(null); // Reset subcategory when switching main tab
              }}
              style={{
                textTransform: "capitalize",
                fontWeight: 600,
              }}
            >
              {tab === "all" && (isAr ? "الكل" : "All")}
              {tab === "skill" && (isAr ? "المهارات" : "Skills")}
              {tab === "mcp" && (isAr ? "موصلات MCP" : "MCP Connectors")}
              {tab === "plugin" && (isAr ? "الإضافات" : "Plugins")}
              {tab === "installed" && (isAr ? "المثبتة" : "Installed")}
            </button>
          ))}
        </div>

        {/* Right: Search Box */}
        <div style={{ position: "relative", minWidth: "260px", flexGrow: 0.5 }}>
          <span
            style={{
              position: "absolute",
              left: isAr ? "auto" : "12px",
              right: isAr ? "12px" : "auto",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fg-3)",
              display: "flex",
              alignItems: "center"
            }}
          >
            <Icon name="magnifying-glass" size={15} />
          </span>
          <input
            type="text"
            placeholder={isAr ? "ابحث عن المهارات والإضافات..." : "Search skills & connectors..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: isAr ? "10px 36px 10px 12px" : "10px 12px 10px 36px",
              background: "var(--bg-1, #131010)",
              border: "1px solid var(--border-3, #3f3f46)",
              color: "var(--fg-1)",
              borderRadius: "6px",
              fontSize: "13px",
              outline: "none",
              textAlign: isAr ? "right" : "left",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: isAr ? "auto" : "12px",
                left: isAr ? "12px" : "auto",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--fg-3)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <Icon name="x-mark" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Categories Horizontal Carousel */}
      {allCategories.length > 0 && activeTab !== "installed" && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            padding: "2px 0",
            scrollbarWidth: "none",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "4px 12px",
              borderRadius: "16px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              background: selectedCategory === null ? "var(--accent, #ea580c)" : "var(--bg-3)",
              border: `1px solid ${selectedCategory === null ? "var(--accent)" : "var(--border-3)"}`,
              color: selectedCategory === null ? "#fff" : "var(--fg-2)",
              whiteSpace: "nowrap",
            }}
          >
            {isAr ? "كل الفئات" : "All Categories"}
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              style={{
                padding: "4px 12px",
                borderRadius: "16px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                background: selectedCategory === cat ? "var(--accent, #ea580c)" : "var(--bg-3)",
                border: `1px solid ${selectedCategory === cat ? "var(--accent)" : "var(--border-3)"}`,
                color: selectedCategory === cat ? "#fff" : "var(--fg-2)",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid Canvas */}
      {loading ? (
        // Grid skeleton loaders
        <div className="marketplace-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: "220px",
                background: "var(--bg-3)",
                borderRadius: "12px",
                border: "1px solid var(--border-3)",
                animation: "pulse 1.5s infinite ease-in-out",
              }}
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        // Beautiful Empty State
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            background: "var(--bg-3, #292524)",
            border: "1px solid var(--border-3, #2e2a24)",
            borderRadius: "var(--r-md, 12px)",
            textAlign: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(234, 88, 12, 0.08)",
              display: "grid",
              placeItems: "center",
              color: "var(--accent, #ea580c)",
            }}
          >
            <Icon name="archive-box" size={30} />
          </div>
          <h3 style={{ margin: "10px 0 0 0", color: "var(--fg-1)" }}>
            {isAr ? "لم يتم العثور على نتائج" : "No Items Found"}
          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--fg-3)", maxWidth: "340px", lineHeight: "1.5" }}>
            {isAr
              ? "لم نجد أي إضافات أو مهارات تطابق خيارات التصفية أو البحث الحالية."
              : "We couldn't find any registry items matching your search query or tab filters."}
          </p>
        </div>
      ) : (
        // Grid cards
        <div className="marketplace-grid">
          {filteredItems.map((item) => (
            <MarketplaceCard
              key={item.id}
              item={item}
              installedStatus={getItemInstalledStatus(item)}
              onInstall={(it) => setSelectedInstallItem(it)}
              onConfigure={(it) => setSelectedInstallItem(it)} // Configure uses same flow to modify credentials
              onUninstall={handleUninstall}
              onOpenDetails={(it) => setSelectedDetailItem(it)}
              isAr={isAr}
            />
          ))}
        </div>
      )}

      {/* Render Detail Modal */}
      {selectedDetailItem && (
        <MarketplaceDetailModal
          item={selectedDetailItem}
          installedStatus={getItemInstalledStatus(selectedDetailItem)}
          onClose={() => setSelectedDetailItem(null)}
          onInstall={(it) => setSelectedInstallItem(it)}
          onConfigure={(it) => setSelectedInstallItem(it)}
          onUninstall={handleUninstall}
          isAr={isAr}
        />
      )}

      {/* Render Install Flow Wizard */}
      {selectedInstallItem && (
        <InstallFlowModal
          item={selectedInstallItem}
          onClose={() => setSelectedInstallItem(null)}
          onInstalled={() => {
            onRefresh();
            onRefresh(); // trigger double refresh for UI sync safety
          }}
          isAr={isAr}
        />
      )}
    </div>
  );
}
