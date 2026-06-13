import { Icon } from "../Icon";
import type { AppView, ThemeMode } from "../../types";

export const NAV_ITEMS: { id: AppView; icon: string; label: string }[] = [
  { id: "tasks", icon: "bot", label: "Tasks" },
  { id: "files", icon: "folder", label: "Files" },
  { id: "git", icon: "git-branch", label: "Git" },
  { id: "browser", icon: "globe", label: "Browser" },
  { id: "schedule", icon: "clock", label: "Scheduled" },
  { id: "providers", icon: "cpu", label: "Providers" },
  { id: "plugins", icon: "puzzle", label: "Plugins & MCP" },
  { id: "computer", icon: "monitor", label: "Computer use" },
  { id: "memory", icon: "brain", label: "Memory" },
  { id: "audit", icon: "scroll-text", label: "Audit log" },
];

interface TitleBarProps {
  crumb: string;
  brandName?: string;
  theme: ThemeMode;
  dir?: "ltr" | "rtl";
  onToggleTheme: () => void;
  onToggleCtx: () => void;
  onToggleDir?: () => void;
}

export function TitleBar({
  crumb,
  brandName = "Aura Work",
  theme,
  dir = "ltr",
  onToggleTheme,
  onToggleCtx,
  onToggleDir,
}: TitleBarProps) {
  const toggleIcon = theme === "light" || theme === "blue" ? "moon" : "sun";

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="tb-title">
        <span className="brand-name">{brandName}</span>
        <span className="crumb">/ {crumb.split("/").pop()?.trim()}</span>
      </div>
      <div className="tb-spacer" />
      <div className="tb-actions">
        {onToggleDir && (
          <button type="button" className="tb-btn" title="Toggle direction" onClick={onToggleDir} style={{ font: "var(--text-label)", fontWeight: 600 }}>
            {dir === "rtl" ? "ع" : "EN"}
          </button>
        )}
        <button type="button" className="tb-btn" title="Toggle theme" onClick={onToggleTheme}>
          <Icon name={toggleIcon} size={16} />
        </button>
        <button type="button" className="tb-btn" title="Toggle context panel" onClick={onToggleCtx}>
          <Icon name="panel-right" size={16} />
        </button>
      </div>
    </div>
  );
}

interface NavRailProps {
  active: AppView;
  onNav: (view: AppView) => void;
  items?: { id: AppView; icon: string; label: string }[];
  settingsLabel?: string;
  accountTitle?: string;
  brandLogoSrc?: string;
}

export function NavRail({
  active,
  onNav,
  items = NAV_ITEMS,
  settingsLabel = "Settings",
  accountTitle = "Account",
  brandLogoSrc,
}: NavRailProps) {
  return (
    <div className="navrail">
      <div className="brand-mark" title="Aura Work">
        {brandLogoSrc ? (
          <img src={brandLogoSrc} alt="" className="brand-logo" />
        ) : (
          <>
            <div className="ring" />
            <div className="dot" />
          </>
        )}
      </div>
      {items.map((n) => (
        <button
          key={n.id}
          type="button"
          className={`nav-item${active === n.id ? " active" : ""}`}
          title={n.label}
          onClick={() => onNav(n.id)}
        >
          <Icon name={n.icon} size={20} />
        </button>
      ))}
      <div className="spacer" />
      <button
        type="button"
        className={`nav-item${active === "settings" ? " active" : ""}`}
        title={settingsLabel}
        onClick={() => onNav("settings")}
      >
        <Icon name="settings" size={20} />
      </button>
      <button type="button" className="nav-avatar" title={accountTitle}>
        A
      </button>
    </div>
  );
}
