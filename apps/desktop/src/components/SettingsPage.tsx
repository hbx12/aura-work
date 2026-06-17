import { useState } from "react";
import { Icon, type ThemeMode, type ThemePreference } from "@aura-os/ui";
import type { BrowserStatus, PluginsHelperStatus, VmStatus } from "@aura-os/shared";
import type { MessageCatalog } from "@aura-os/i18n";
import type { VaultStatus } from "../hooks/useProviders";
import type { AppLocaleSettings, LocaleInfo, PackagingInfo, UpdateCheckResult } from "../hooks/useI18n";
import { CloudPage } from "./CloudPage";
import { ExtensionsPage } from "./ExtensionsPage";
import type { CloudAccountStatus, CloudDeviceInfo, CloudSyncStatus, BridgeClientRecord, BridgeStatus } from "@aura-os/shared";
import { PetSprite } from "./PetSprites";
import { invoke } from "@tauri-apps/api/core";

import { ReadinessPage } from "./ReadinessPage";
import { DiagnosticsPage } from "./DiagnosticsPage";
import { LocalModelWizard } from "./LocalModelWizard";
import { ApprovalInbox } from "./ApprovalInbox";

type SettingsTab = "general" | "vault" | "vm" | "cloud" | "extension" | "pet" | "readiness" | "diagnostics" | "local_model" | "approvals";

const THEME_OPTIONS: { id: ThemePreference; labelKey: keyof MessageCatalog; preview?: ThemeMode }[] = [
  { id: "system", labelKey: "settings.themeSystem" },
  { id: "light", labelKey: "settings.themeLight" },
  { id: "dark", labelKey: "settings.themeDark" },
  { id: "amoled", labelKey: "settings.themeAmoled" },
  { id: "blue", labelKey: "settings.themeBlue" },
  { id: "high-contrast", labelKey: "settings.themeHighContrast" },
  { id: "cyberpunk", labelKey: "settings.themeCyberpunk" },
  { id: "forest", labelKey: "settings.themeForest" },
  { id: "pastel", labelKey: "settings.themePastel" },
  { id: "sunset", labelKey: "settings.themeSunset" },
  { id: "sepia", labelKey: "settings.themeSepia" },
  { id: "nord", labelKey: "settings.themeNord" },
  { id: "dracula", labelKey: "settings.themeDracula" },
  { id: "matrix", labelKey: "settings.themeMatrix" },
  { id: "sakura", labelKey: "settings.themeSakura" },
  { id: "sakura-dark", labelKey: "settings.themeSakuraDark" },
  { id: "coffee", labelKey: "settings.themeCoffee" },
  { id: "ocean", labelKey: "settings.themeOcean" },
  { id: "luxury", labelKey: "settings.themeLuxury" },
  { id: "emerald-luxury", labelKey: "settings.themeEmeraldLuxury", preview: "emerald-luxury" },
  { id: "rose-luxury", labelKey: "settings.themeRoseLuxury", preview: "rose-luxury" },
  { id: "velvet-luxury", labelKey: "settings.themeVelvetLuxury", preview: "velvet-luxury" },
  { id: "bronze-luxury", labelKey: "settings.themeBronzeLuxury", preview: "bronze-luxury" },
  { id: "platinum-luxury", labelKey: "settings.themePlatinumLuxury", preview: "platinum-luxury" },
  { id: "crimson-luxury", labelKey: "settings.themeCrimsonLuxury", preview: "crimson-luxury" },
  { id: "sapphire-luxury", labelKey: "settings.themeSapphireLuxury", preview: "sapphire-luxury" },
  { id: "amethyst-luxury", labelKey: "settings.themeAmethystLuxury", preview: "amethyst-luxury" },
  { id: "amber-luxury", labelKey: "settings.themeAmberLuxury", preview: "amber-luxury" },
  { id: "obsidian-gold", labelKey: "settings.themeObsidianGold", preview: "obsidian-gold" },
  { id: "pearl-noir", labelKey: "settings.themePearlNoir", preview: "pearl-noir" },
  { id: "jade-silk", labelKey: "settings.themeJadeSilk", preview: "jade-silk" },
  { id: "arctic-glass", labelKey: "settings.themeArcticGlass", preview: "arctic-glass" },
  { id: "royal-indigo", labelKey: "settings.themeRoyalIndigo", preview: "royal-indigo" },
  { id: "copper-olive", labelKey: "settings.themeCopperOlive", preview: "copper-olive" },
  { id: "moonlit-rose", labelKey: "settings.themeMoonlitRose", preview: "moonlit-rose" },
  { id: "carbon-teal", labelKey: "settings.themeCarbonTeal", preview: "carbon-teal" },
];

const SANS_FONTS = [
  { id: "IBM Plex Sans", name: "IBM Plex Sans", preview: "Ab" },
  { id: "Inter", name: "Inter", preview: "Ab" },
  { id: "Roboto", name: "Roboto", preview: "Ab" },
  { id: "Outfit", name: "Outfit", preview: "Ab" },
  { id: "Cairo", name: "Cairo (القاهرة)", preview: "أب" },
  { id: "Tajawal", name: "Tajawal (تجوال)", preview: "أب" },
  { id: "Almarai", name: "Almarai (المراعي)", preview: "أب" },
];

const MONO_FONTS = [
  { id: "IBM Plex Mono", name: "IBM Plex Mono", preview: "code" },
  { id: "Fira Code", name: "Fira Code", preview: "code" },
  { id: "JetBrains Mono", name: "JetBrains Mono", preview: "code" },
  { id: "Courier New", name: "Courier New", preview: "code" },
];

const SETTINGS_NAV: { groupKey?: keyof MessageCatalog; id?: SettingsTab; icon?: string; labelKey?: keyof MessageCatalog }[] = [
  { groupKey: "settings.group.preferences" },
  { id: "general", icon: "settings", labelKey: "settings.general" },
  { id: "pet", icon: "sparkles", labelKey: "settings.pet" },
  { id: "vault", icon: "key-round", labelKey: "settings.vault" },
  { groupKey: "settings.group.runtime" },
  { id: "vm", icon: "hard-drive", labelKey: "settings.vm" },
  { id: "cloud", icon: "cloud", labelKey: "cloud.title" },
  { id: "extension", icon: "plug", labelKey: "settings.extension" },
  { groupKey: "settings.group.safety" },
  { id: "readiness", icon: "shield-check", labelKey: "settings.readiness" },
  { id: "diagnostics", icon: "list-checks", labelKey: "settings.diagnostics" },
  { id: "local_model", icon: "bot", labelKey: "settings.localModel" },
  { id: "approvals", icon: "shield", labelKey: "settings.approvals" },
];

interface SettingsPageProps {
  vaultStatus: VaultStatus | null;
  vmStatus: VmStatus | null;
  vmLoading?: boolean;
  onStartVm: () => Promise<VmStatus>;
  onStopVm: () => Promise<VmStatus>;
  browserStatus: BrowserStatus | null;
  browserLoading?: boolean;
  onStartBrowser: () => Promise<BrowserStatus>;
  onStopBrowser: () => Promise<BrowserStatus>;
  pluginsStatus: PluginsHelperStatus | null;
  pluginsLoading?: boolean;
  onStartPlugins: () => Promise<PluginsHelperStatus>;
  onStopPlugins: () => Promise<PluginsHelperStatus>;
  onExport: (password: string) => Promise<string>;
  onImport: (password: string, dataBase64: string) => Promise<void>;
  onFetchPricing: () => Promise<{ updated: number; source: string; message?: string }>;
  localeSettings: AppLocaleSettings | null;
  locales: LocaleInfo[];
  onSetLocale: (input: { locale?: string; useSystemLocale?: boolean }) => Promise<AppLocaleSettings>;
  t: (key: keyof MessageCatalog, params?: Record<string, string>) => string;
  packagingInfo: PackagingInfo | null;
  updateResult: UpdateCheckResult | null;
  updateLoading?: boolean;
  onCheckUpdates: () => Promise<UpdateCheckResult>;
  theme: ThemeMode;
  themePreference: ThemePreference;
  onSetTheme: (theme: ThemePreference) => void;
  projectId: string | null;
  cloudStatus: CloudAccountStatus | null;
  cloudDevices: CloudDeviceInfo[];
  cloudSyncHelper: CloudSyncStatus | null;
  cloudUsage?: any | null;
  cloudReleaseInfo?: any | null;
  cloudLoading?: boolean;
  cloudError?: string | null;
  onCloudRegister: (
    email: string,
    password: string,
    displayName?: string,
    serverUrl?: string,
  ) => Promise<{ recoveryKey: string }>;
  onCloudLogin: (email: string, password: string, serverUrl?: string) => Promise<unknown>;
  onCloudLogout: () => Promise<unknown>;
  onCloudSetupRecovery: (recoveryKey: string) => Promise<unknown>;
  onCloudSetSyncEnabled: (enabled: boolean) => Promise<unknown>;
  onCloudSyncNow: () => Promise<unknown>;
  onCloudCreatePairing: () => Promise<{ code: string; expiresAt: string; qrPayload: string }>;
  onCloudRevokeDevice: (deviceId: string) => Promise<void>;
  onCloudRemoteDispatch: (targetDeviceId: string, projectId: string, prompt: string) => Promise<unknown>;
  onCloudInspectServer: () => Promise<unknown>;
  onCloudStartSyncHelper: () => Promise<unknown>;
  onCloudStopSyncHelper: () => Promise<unknown>;
  onCloudStartDeviceLogin?: () => Promise<any>;
  onCloudCompleteDeviceLogin?: () => Promise<any>;
  bridgeStatus: BridgeStatus | null;
  bridgeClients: BridgeClientRecord[];
  bridgeLoading?: boolean;
  bridgeError?: string | null;
  onBridgeRefresh: () => Promise<void>;
  onBridgeStart: () => Promise<unknown>;
  onBridgeStop: () => Promise<unknown>;
  onBridgeCreatePairing: () => Promise<{ code: string; expiresAt: string }>;
  onBridgeRevokeClient: (clientId: string) => Promise<void>;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
}

function ServicePanel({
  icon,
  title,
  subtitle,
  running,
  remediation,
  error,
  startLabel,
  stopLabel,
  onStart,
  onStop,
  startDisabled,
  stopDisabled,
  desc,
}: {
  icon: string;
  title: string;
  subtitle: string;
  running?: boolean;
  remediation?: string | null;
  error?: string | null;
  startLabel: string;
  stopLabel: string;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  startDisabled?: boolean;
  stopDisabled?: boolean;
  desc?: string;
}) {
  return (
    <div className="settings-card panel">
      <div className="panel-row">
        <div className="prov-logo" style={{ background: "var(--accent)" }}>
          <Icon name={icon} size={17} />
        </div>
        <div className="prov-meta">
          <div className="prov-name">
            {title}
            {running && <span className="tag ok">Running</span>}
            {running === false && <span className="tag">Stopped</span>}
          </div>
          <div className="prov-sub">{subtitle}</div>
          {remediation && <p className="modal-desc vm-remediation">{remediation}</p>}
          {error && <p className="modal-error">{error}</p>}
        </div>
      </div>
      <div className="panel-actions">
        <button type="button" className="btn sm primary" disabled={startDisabled} onClick={() => void onStart()}>
          {startLabel}
        </button>
        <button type="button" className="btn sm" disabled={stopDisabled} onClick={() => void onStop()}>
          {stopLabel}
        </button>
      </div>
      {desc && <p className="modal-desc">{desc}</p>}
    </div>
  );
}

const PETS_LIST = [
  { id: "robot", nameEn: "AuraBot", nameAr: "أورابوت", descEn: "Retro computer bot", descAr: "روبوت كلاسيكي لطيف" },
  { id: "cat", nameEn: "Mochi the Cat", nameAr: "موشي القطة", descEn: "Chubby orange tabby", descAr: "قطة برتقالية سمينة" },
  { id: "dog", nameEn: "Shiba Inu", nameAr: "شيبا الكلب", descEn: "Gentle cream-tan pup", descAr: "جرو لطيف ومبهج" },
  { id: "bunny", nameEn: "Bunny", nameAr: "الأرنب", descEn: "White fluffy rabbit", descAr: "أرنب أبيض ناعم" },
  { id: "panda", nameEn: "Panda", nameAr: "الباندا", descEn: "Classic black & white bear", descAr: "دب الباندا الشهير" },
  { id: "fox", nameEn: "Fox", nameAr: "الثعلب", descEn: "Vibrant orange kit", descAr: "ثعلب برتقالي ذكي" },
  { id: "hamster", nameEn: "Hamster", nameAr: "الهامستر", descEn: "Cheery golden hamster", descAr: "هامستر ذهبي سعيد" },
  { id: "penguin", nameEn: "Penguin", nameAr: "البطريق", descEn: "Penguin with earmuffs", descAr: "بطريق يرتدي غطاء أذن" },
  { id: "koala", nameEn: "Koala", nameAr: "الكوالا", descEn: "Fluffy gray koala bear", descAr: "دب كوالا رمادي منفوش" },
  { id: "bear", nameEn: "Bear", nameAr: "الدب", descEn: "Friendly brown grizzly", descAr: "دب بني لطيف وودود" },
  { id: "pig", nameEn: "Piggy", nameAr: "الخنزير الصغير", descEn: "Cute pink piglet", descAr: "خنزير وردي صغير ولطيف" },
  { id: "tiger", nameEn: "Tiger", nameAr: "النمر", descEn: "Little orange tiger cub", descAr: "شبل نمر برتقالي صغير" }
];

interface FontOption {
  id: string;
  name: string;
  preview: string;
}

function CustomFontDropdown({
  options,
  selectedId,
  onSelect,
  isMono = false
}: {
  options: FontOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  isMono?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(o => o.id === selectedId) || { id: selectedId, name: selectedId, preview: isMono ? "code" : "Ab" };

  return (
    <div className="custom-select-container" style={{ position: "relative", width: "100%" }}>
      {/* Dropdown Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-inset)",
          border: "1px solid var(--border-3)",
          borderRadius: "8px",
          padding: "10px 14px",
          cursor: "pointer",
          color: "var(--fg-1)",
          fontFamily: selectedOption.id,
          fontSize: "14px",
          transition: "all 0.2s ease",
          userSelect: "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Small visual glyph block */}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "4px",
              background: "var(--bg-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMono ? "12px" : "15px",
              fontWeight: "bold",
              color: "var(--accent)",
              fontFamily: selectedOption.id
            }}
          >
            {selectedOption.preview}
          </div>
          <span style={{ fontWeight: 500 }}>{selectedOption.name}</span>
        </div>
        <div style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease", display: "flex", alignItems: "center" }}>
          <Icon name="chevron-down" size={16} />
        </div>
      </div>

      {/* Dropdown Options Menu */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              background: "transparent"
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              background: "var(--bg-1)",
              border: "1px solid var(--border-2)",
              borderRadius: "8px",
              boxShadow: "var(--shadow-2)",
              zIndex: 1000,
              maxHeight: "260px",
              overflowY: "auto",
              padding: "4px"
            }}
          >
            {options.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <div
                  key={option.id}
                  onClick={() => {
                    onSelect(option.id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: isSelected ? "var(--bg-active)" : "transparent",
                    transition: "background 0.15s ease",
                    fontFamily: option.id,
                    userSelect: "none"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "4px",
                        background: "var(--bg-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isMono ? "12px" : "15px",
                        fontWeight: "bold",
                        color: isSelected ? "var(--accent)" : "var(--fg-2)",
                        fontFamily: option.id
                      }}
                    >
                      {option.preview}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: isSelected ? 600 : 400, color: isSelected ? "var(--accent)" : "var(--fg-1)" }}>
                      {option.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div style={{ color: "var(--accent)", display: "flex", alignItems: "center" }}>
                      <Icon name="check" size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function SettingsPage({
  vaultStatus,
  vmStatus,
  vmLoading,
  onStartVm,
  onStopVm,
  browserStatus,
  browserLoading,
  onStartBrowser,
  onStopBrowser,
  pluginsStatus,
  pluginsLoading,
  onStartPlugins,
  onStopPlugins,
  onExport,
  onImport,
  onFetchPricing,
  localeSettings,
  locales,
  onSetLocale,
  t,
  packagingInfo,
  updateResult,
  updateLoading,
  onCheckUpdates,
  theme,
  themePreference,
  onSetTheme,
  projectId,
  cloudStatus,
  cloudDevices,
  cloudSyncHelper,
  cloudUsage,
  cloudReleaseInfo,
  cloudLoading,
  cloudError,
  onCloudRegister,
  onCloudLogin,
  onCloudLogout,
  onCloudSetupRecovery,
  onCloudSetSyncEnabled,
  onCloudSyncNow,
  onCloudCreatePairing,
  onCloudRevokeDevice,
  onCloudRemoteDispatch,
  onCloudInspectServer,
  onCloudStartSyncHelper,
  onCloudStopSyncHelper,
  onCloudStartDeviceLogin,
  onCloudCompleteDeviceLogin,
  bridgeStatus,
  bridgeClients,
  bridgeLoading,
  bridgeError,
  onBridgeRefresh,
  onBridgeStart,
  onBridgeStop,
  onBridgeCreatePairing,
  onBridgeRevokeClient,
  activeTab,
  onTabChange,
}: SettingsPageProps) {
  const [exportPassword, setExportPassword] = useState("");
  const [activeSans, setActiveSans] = useState(() => localStorage.getItem("selected-font-sans") || "IBM Plex Sans");
  const [activeMono, setActiveMono] = useState(() => localStorage.getItem("selected-font-mono") || "IBM Plex Mono");
  const [importPassword, setImportPassword] = useState("");
  const [importData, setImportData] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localTab, setLocalTab] = useState<SettingsTab>("general");
  const tab = activeTab ? (activeTab as SettingsTab) : localTab;
  const setTab = onTabChange ? onTabChange : setLocalTab;
  const [selectedPet, setSelectedPet] = useState(() => localStorage.getItem("selected-pet") || "robot");

  const showMsg = (m: string) => setMessage(m);
  const localeKey = (id: string) => `lang.${id}` as keyof MessageCatalog;

  return (
    <div className="page">
      <div className="settings-layout">
        <div className="settings-nav">
          {SETTINGS_NAV.map((item, i) =>
            item.groupKey ? (
              <div key={`g-${i}`} className="sn-group">
                {t(item.groupKey)}
              </div>
            ) : (
              <div
                key={item.id}
                className={`sn-item${tab === item.id ? " active" : ""}`}
                onClick={() => item.id && setTab(item.id)}
                onKeyDown={(e) => e.key === "Enter" && item.id && setTab(item.id)}
                role="button"
                tabIndex={0}
              >
                {item.icon && <Icon name={item.icon} size={16} />}
                {item.labelKey ? <span className="sn-label">{t(item.labelKey)}</span> : null}
              </div>
            ),
          )}
        </div>
        <div className="settings-body">
          <div className="settings-inner">
            {message && <p className="settings-toast">{message}</p>}

            {tab === "general" && (
              <>
                <div className="s-title">{t("settings.general") || "General"}</div>
                <p className="s-sub">{t("settings.subtitle")}</p>
                <div className="section">
                  <span className="sec-label">{t("settings.language")}</span>
                  <div className="panel">
                    <div className="field">
                      <div className="fl">
                        <div className="fn">{t("settings.language")}</div>
                        <div className="fd">{t("settings.languageDesc")}</div>
                      </div>
                      <div className="fc">
                        <select
                          className="select"
                          value={localeSettings?.useSystemLocale ? "system" : (localeSettings?.locale ?? "en")}
                          onChange={async (e) => {
                            const v = e.target.value;
                            setBusy(true);
                            try {
                              if (v === "system") await onSetLocale({ useSystemLocale: true });
                              else await onSetLocale({ locale: v, useSystemLocale: false });
                              showMsg(t("settings.languageUpdated"));
                            } catch (err) {
                              showMsg(String(err));
                            } finally {
                              setBusy(false);
                            }
                          }}
                          disabled={busy}
                        >
                          <option value="system">{t("settings.systemLanguage")}</option>
                          {locales.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {t(localeKey(loc.id))}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="section">
                  <span className="sec-label">{t("settings.updates")}</span>
                  <div className="panel">
                    <div className="field">
                      <div className="fl">
                        <div className="fn">{t("settings.checkUpdates")}</div>
                        <div className="fd">{updateResult?.message ?? t("settings.updatesDesc")}</div>
                      </div>
                      <div className="fc">
                        <button
                          type="button"
                          className="btn sm primary"
                          disabled={busy || updateLoading}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              const r = await onCheckUpdates();
                              showMsg(
                                r.available && r.latestVersion
                                  ? t("settings.updateAvailable", { version: r.latestVersion })
                                  : t("settings.upToDate"),
                              );
                            } catch (e) {
                              showMsg(String(e));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {t("settings.checkUpdates")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="section">
                  <span className="sec-label">{t("settings.packaging")}</span>
                  <div className="panel">
                    <div className="panel-row">
                      <div className="prov-logo" style={{ background: "var(--accent)" }}>
                        <Icon name="globe" size={17} />
                      </div>
                      <div className="prov-meta">
                        <div className="prov-name">
                          {t("settings.bundledRuntime")}
                          {packagingInfo?.nodeRuntimeBundled && (
                            <span className="tag ok">{t("settings.bundled")}</span>
                          )}
                        </div>
                        <div className="prov-sub">
                          v{packagingInfo?.appVersion ?? "1.0.0"} · {packagingInfo?.sidecarCount ?? 7}{" "}
                          {t("settings.sidecars")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="section">
                  <span className="sec-label">{t("settings.appearance")}</span>
                  <div className="panel">
                    <div className="field">
                      <div className="fl">
                        <div className="fn">{t("settings.theme")}</div>
                        <div className="fd">{t("settings.themeDesc")}</div>
                      </div>
                    </div>
                    <div className="theme-grid" role="radiogroup" aria-label={t("settings.theme")}>
                      {THEME_OPTIONS.map((option) => {
                        const previewTheme: ThemeMode =
                          option.id === "system" ? theme : (option.preview ?? (option.id as ThemeMode));
                        const selected = themePreference === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`theme-option${selected ? " active" : ""}`}
                            aria-checked={selected}
                            role="radio"
                            onClick={() => {
                              onSetTheme(option.id);
                              showMsg(t("settings.themeUpdated"));
                            }}
                          >
                            <span className="theme-preview" data-preview-theme={previewTheme}>
                              <span />
                              <span />
                              <span />
                            </span>
                            <span className="theme-name">{t(option.labelKey)}</span>
                          </button>
                        );
                      })}
                      </div>
                  </div>
                </div>

                <div className="section" style={{ marginTop: 24 }}>
                  <span className="sec-label">{t("settings.fontsTitle") || "Fonts & Typography"}</span>
                  <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px" }}>
                    
                    {/* UI Font (Sans) Selection */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ font: "var(--text-label)", fontWeight: 600, color: "var(--fg-2)" }}>
                        {t("settings.uiFont") || "UI Font Family (Sans)"}
                      </span>
                      <CustomFontDropdown
                        options={[...SANS_FONTS, ...( !SANS_FONTS.some(f => f.id === activeSans) ? [{ id: activeSans, name: activeSans, preview: "Ab" }] : [] )]}
                        selectedId={activeSans}
                        onSelect={(id) => {
                          localStorage.setItem("selected-font-sans", id);
                          setActiveSans(id);
                          window.dispatchEvent(new StorageEvent("storage", {
                            key: "selected-font-sans",
                            newValue: id,
                            storageArea: localStorage
                          }));
                        }}
                      />
                    </div>

                    {/* Code Font (Mono) Selection */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ font: "var(--text-label)", fontWeight: 600, color: "var(--fg-2)" }}>
                        {t("settings.codeFont") || "Code Font Family (Mono)"}
                      </span>
                      <CustomFontDropdown
                        options={[...MONO_FONTS, ...( !MONO_FONTS.some(f => f.id === activeMono) ? [{ id: activeMono, name: activeMono, preview: "code" }] : [] )]}
                        selectedId={activeMono}
                        onSelect={(id) => {
                          localStorage.setItem("selected-font-mono", id);
                          setActiveMono(id);
                          window.dispatchEvent(new StorageEvent("storage", {
                            key: "selected-font-mono",
                            newValue: id,
                            storageArea: localStorage
                          }));
                        }}
                        isMono={true}
                      />
                    </div>

                    {/* Import custom Google Fonts */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ font: "var(--text-label)", fontWeight: 600, color: "var(--fg-2)" }}>
                        {t("settings.importGoogleFont") || "Import Google Font"}
                      </span>
                      <div style={{ display: "flex", gap: 10 }}>
                        <input
                          type="text"
                          id="custom-google-font-input"
                          placeholder="e.g. Poppins, Playfair Display, Montserrat"
                          style={{
                            flex: 1,
                            background: "var(--bg-1)",
                            border: "1px solid var(--border-2)",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            color: "var(--fg-1)",
                            font: "inherit",
                            outline: "none"
                          }}
                        />
                        <button
                          type="button"
                          className="btn primary sm"
                          onClick={() => {
                            const input = document.getElementById("custom-google-font-input") as HTMLInputElement;
                            if (input && input.value.trim()) {
                              const fontName = input.value.trim();
                              localStorage.setItem("selected-font-sans", fontName);
                              setActiveSans(fontName);
                              window.dispatchEvent(new StorageEvent("storage", {
                                key: "selected-font-sans",
                                newValue: fontName,
                                storageArea: localStorage
                              }));
                              showMsg(t("settings.fontImported") || `Imported & applied ${fontName}`);
                              input.value = "";
                            }
                          }}
                        >
                          {t("common.apply") || "Apply"}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="section" style={{ marginTop: 24 }}>
                  <span className="sec-label">{t("settings.budgetTitle") || "Meters & Budgeting"}</span>
                  <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="fl">
                        <div className="fn">{t("settings.monthlyBudget") || "Monthly API Cost Limit"}</div>
                        <div className="fd">{t("settings.monthlyBudgetDesc") || "Prevent running agents if spending exceeds this limit."}</div>
                      </div>
                      <select
                        value={localStorage.getItem("aura-monthly-budget") || "unlimited"}
                        onChange={(e) => {
                          localStorage.setItem("aura-monthly-budget", e.target.value);
                          showMsg(t("settings.budgetUpdated") || "Budget updated successfully");
                        }}
                        style={{
                          background: "var(--bg-1)",
                          border: "1px solid var(--border-3)",
                          padding: "8px 12px",
                          borderRadius: "var(--r-sm)",
                          color: "var(--fg-1)",
                          font: "inherit"
                        }}
                      >
                        <option value="unlimited">{t("settings.budgetUnlimited") || "No Limit"}</option>
                        <option value="1.00">$1.00</option>
                        <option value="5.00">$5.00</option>
                        <option value="10.00">$10.00</option>
                        <option value="25.00">$25.00</option>
                        <option value="50.00">$50.00</option>
                        <option value="100.00">$100.00</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "vault" && (
              <>
                <div className="s-title">{t("settings.vault")}</div>
                <p className="s-sub">{t("settings.vaultEncrypted")}</p>
                <div className="vault-hero">
                  <div className="vlock">
                    <Icon name="key-round" size={22} />
                  </div>
                  <div>
                    <div className="vt">
                      {t("settings.vaultEncrypted")}
                      {vaultStatus?.unlocked && <span className="tag ok">{t("common.running")}</span>}
                    </div>
                    <div className="vs">
                      v{vaultStatus?.version ?? 1} · {vaultStatus?.secretCount ?? 0} secrets
                    </div>
                  </div>
                </div>
                <div className="section">
                  <span className="sec-label">{t("settings.vaultExport")}</span>
                  <div className="panel">
                    <label className="field">
                      <span>{t("settings.vaultExportPw")}</span>
                      <input type="password" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)} />
                    </label>
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={busy || exportPassword.length < 8}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const data = await onExport(exportPassword);
                          await navigator.clipboard.writeText(data);
                          showMsg(t("settings.vaultExported"));
                        } catch (e) {
                          showMsg(String(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {t("settings.vaultExportBtn")}
                    </button>
                  </div>
                </div>
                <div className="section">
                  <span className="sec-label">{t("settings.vaultImport")}</span>
                  <div className="panel">
                    <label className="field">
                      <span>{t("settings.vaultImportData")}</span>
                      <textarea rows={3} value={importData} onChange={(e) => setImportData(e.target.value)} />
                    </label>
                    <label className="field">
                      <span>{t("settings.vaultExportPw")}</span>
                      <input type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)} />
                    </label>
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={busy || !importData.trim() || !importPassword}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await onImport(importPassword, importData.trim());
                          showMsg(t("settings.vaultImported"));
                        } catch (e) {
                          showMsg(String(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {t("settings.vaultImportBtn")}
                    </button>
                  </div>
                </div>
                <div className="section">
                  <span className="sec-label">{t("settings.pricing")}</span>
                  <div className="panel">
                    <p className="modal-desc">{t("settings.pricingDesc")}</p>
                    <button
                      type="button"
                      className="btn sm primary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const r = await onFetchPricing();
                          showMsg(`${r.updated} models (${r.source})`);
                        } catch (e) {
                          showMsg(String(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {t("settings.pricingBtn")}
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === "vm" && (
              <>
                <div className="s-title">{t("settings.vm")}</div>
                <p className="s-sub">Runtime helpers for tasks — VM, browser automation, and plugins.</p>
                <div className="section">
                  <span className="sec-label">{t("settings.vm")}</span>
                  <ServicePanel
                    icon="terminal"
                    title={vmStatus?.backendLabel ?? t("common.offline")}
                    subtitle={`v${vmStatus?.imageVersion ?? "1.0.0"} · ${vmStatus?.mounts?.length ?? 0} mount(s)`}
                    running={vmStatus?.running}
                    remediation={vmStatus?.remediation}
                    error={vmStatus?.lastError && !vmStatus.running ? vmStatus.lastError : null}
                    startLabel={t("settings.vmStart")}
                    stopLabel={t("settings.vmStop")}
                    startDisabled={vmLoading || vmStatus?.running}
                    stopDisabled={vmLoading || !vmStatus?.running}
                    onStart={async () => {
                      setBusy(true);
                      try {
                        await onStartVm();
                        showMsg(t("settings.vmStarted"));
                      } catch (e) {
                        showMsg(String(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                    onStop={async () => {
                      setBusy(true);
                      try {
                        await onStopVm();
                        showMsg(t("settings.vmStopped"));
                      } catch (e) {
                        showMsg(String(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </div>
                <div className="section">
                  <span className="sec-label">{t("settings.browser")}</span>
                  <ServicePanel
                    icon="globe"
                    title={browserStatus?.backendLabel ?? t("common.offline")}
                    subtitle={`${browserStatus?.profiles?.length ?? 0} profile(s)`}
                    running={browserStatus?.running}
                    remediation={browserStatus?.remediation}
                    startLabel={t("settings.browserStart")}
                    stopLabel={t("settings.browserStop")}
                    startDisabled={browserLoading || browserStatus?.running}
                    stopDisabled={browserLoading || !browserStatus?.running}
                    onStart={async () => {
                      setBusy(true);
                      try {
                        await onStartBrowser();
                        showMsg(t("settings.browserStarted"));
                      } catch (e) {
                        showMsg(String(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                    onStop={async () => {
                      setBusy(true);
                      try {
                        await onStopBrowser();
                        showMsg(t("settings.browserStopped"));
                      } catch (e) {
                        showMsg(String(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </div>
                <div className="section">
                  <span className="sec-label">{t("settings.plugins")}</span>
                  <ServicePanel
                    icon="puzzle"
                    title={pluginsStatus?.running ? t("common.running") : t("common.offline")}
                    subtitle={`${pluginsStatus?.pluginCount ?? 0} plugin(s) · ${pluginsStatus?.toolCount ?? 0} tool(s)`}
                    running={pluginsStatus?.running}
                    remediation={pluginsStatus?.remediation}
                    startLabel={t("settings.pluginsStart")}
                    stopLabel={t("settings.pluginsStop")}
                    startDisabled={pluginsLoading || pluginsStatus?.running}
                    stopDisabled={pluginsLoading || !pluginsStatus?.running}
                    onStart={async () => {
                      setBusy(true);
                      try {
                        await onStartPlugins();
                        showMsg(t("settings.pluginsStarted"));
                      } catch (e) {
                        showMsg(String(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                    onStop={async () => {
                      setBusy(true);
                      try {
                        await onStopPlugins();
                        showMsg(t("settings.pluginsStopped"));
                      } catch (e) {
                        showMsg(String(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </div>
              </>
            )}

            {tab === "pet" && (
              <>
                <div className="s-title">{t("settings.pet")}</div>
                <p className="s-sub">{t("settings.petDesc")}</p>
                <div className="section">
                  <div className="panel" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <span className="sec-label" style={{ margin: 0 }}>
                        {localeSettings?.locale === "ar" ? "اختر حيوانك الأليف النشط" : "Select Your Active Pet"}
                      </span>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => {
                          const current = localStorage.getItem("selected-pet") || "robot";
                          invoke("toggle_pet_window", { petType: current }).catch(console.error);
                        }}
                      >
                        {localeSettings?.locale === "ar" ? "تشغيل / إخفاء الأليف" : "Toggle Pet Window"}
                      </button>
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: "16px",
                      marginTop: "16px"
                    }}>
                      {PETS_LIST.map((pet) => {
                        const isSelected = selectedPet === pet.id;
                        const name = localeSettings?.locale === "ar" ? pet.nameAr : pet.nameEn;
                        const desc = localeSettings?.locale === "ar" ? pet.descAr : pet.descEn;
                        return (
                          <div
                            key={pet.id}
                            onClick={() => {
                              localStorage.setItem("selected-pet", pet.id);
                              setSelectedPet(pet.id);
                              window.dispatchEvent(new StorageEvent("storage", {
                                key: "selected-pet",
                                newValue: pet.id,
                                storageArea: localStorage
                              }));
                            }}
                            style={{
                              border: isSelected ? "2px solid var(--accent, #4EA8DE)" : "1px solid var(--border-2, #30303b)",
                              borderRadius: "12px",
                              padding: "16px",
                              background: isSelected ? "var(--accent-dim, rgba(78, 168, 222, 0.08))" : "var(--bg-2, #1e1e24)",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                              transition: "all 0.2s ease-in-out",
                              boxShadow: isSelected ? "0 4px 12px rgba(78, 168, 222, 0.15)" : "none"
                            }}
                          >
                            <div style={{ width: "64px", height: "64px", marginBottom: "12px" }}>
                              <PetSprite type={pet.id} tiltX={0} tiltY={0} facing="left" />
                            </div>
                            <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--fg-1, #e3e3e8)", marginBottom: "4px" }}>
                              {name}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--fg-3, #8e8e93)" }}>
                              {desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "cloud" && (
              <CloudPage
                status={cloudStatus}
                devices={cloudDevices}
                syncHelper={cloudSyncHelper}
                usage={cloudUsage}
                releaseInfo={cloudReleaseInfo}
                loading={cloudLoading}
                error={cloudError}
                projectId={projectId}
                onRegister={onCloudRegister}
                onLogin={onCloudLogin}
                onLogout={onCloudLogout}
                onSetupRecovery={onCloudSetupRecovery}
                onSetSyncEnabled={onCloudSetSyncEnabled}
                onSyncNow={onCloudSyncNow}
                onCreatePairing={onCloudCreatePairing}
                onRevokeDevice={onCloudRevokeDevice}
                onRemoteDispatch={onCloudRemoteDispatch}
                onInspectServer={onCloudInspectServer}
                onStartSyncHelper={onCloudStartSyncHelper}
                onStopSyncHelper={onCloudStopSyncHelper}
                onStartDeviceLogin={onCloudStartDeviceLogin}
                onCompleteDeviceLogin={onCloudCompleteDeviceLogin}
                t={t as (key: string, params?: Record<string, string>) => string}
                embedded
              />
            )}

            {tab === "extension" && (
              <ExtensionsPage
                status={bridgeStatus}
                clients={bridgeClients}
                loading={bridgeLoading}
                error={bridgeError}
                onRefresh={onBridgeRefresh}
                onStart={onBridgeStart}
                onStop={onBridgeStop}
                onCreatePairing={onBridgeCreatePairing}
                onRevokeClient={onBridgeRevokeClient}
                embedded
              />
            )}

            {tab === "readiness" && projectId && (
              <ReadinessPage projectId={projectId} isArabic={localeSettings?.locale === "ar"} />
            )}
            {tab === "diagnostics" && (
              <DiagnosticsPage isArabic={localeSettings?.locale === "ar"} />
            )}
            {tab === "local_model" && (
              <LocalModelWizard isArabic={localeSettings?.locale === "ar"} onClose={() => setTab("general")} />
            )}
            {tab === "approvals" && projectId && (
              <ApprovalInbox projectId={projectId} isArabic={localeSettings?.locale === "ar"} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
