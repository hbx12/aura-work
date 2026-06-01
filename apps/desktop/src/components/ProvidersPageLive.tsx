import { useEffect, useState } from "react";
import { Icon } from "@aura-os/ui";
import { PROVIDER_META, type RoutingPolicy, ROUTING_POLICIES } from "@aura-os/shared";
import type { MessageCatalog } from "@aura-os/i18n";
import type { ProviderConfigPublic } from "../hooks/useProviders";

interface ProvidersPageProps {
  providers: ProviderConfigPublic[];
  routingPolicy: RoutingPolicy;
  loading?: boolean;
  error?: string | null;
  onSelectPolicy: (policy: RoutingPolicy) => void;
  onToggleProvider: (providerId: string, enabled: boolean) => void;
  onConfigure: (providerId: string) => void;
  onValidate: (providerId: string) => Promise<{ valid: boolean; message?: string }>;
  onFetchModels: (providerId: string) => Promise<{ id: string; displayName: string }[]>;
  t: (key: keyof MessageCatalog, params?: Record<string, string>) => string;
}

export function ProvidersPageLive({
  providers,
  routingPolicy,
  loading,
  error,
  onSelectPolicy,
  onToggleProvider,
  onConfigure,
  onValidate,
  onFetchModels,
  t,
}: ProvidersPageProps) {
  const [validating, setValidating] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const statusLabel = (p: ProviderConfigPublic) => {
    if (p.hasSecret) {
      const parts =
        p.authMode === "codex-account"
          ? [t("provider.key.codexAccount")]
          : [t("providers.keySet")];
      if (p.defaultModel) parts.push(p.defaultModel);
      else if (p.baseUrl) parts.push(p.baseUrl);
      if (modelCounts[p.providerId]) {
        parts.push(t("providers.modelsCount", { count: String(modelCounts[p.providerId]) }));
      }
      return parts.join(" · ");
    }
    const meta = PROVIDER_META[p.providerId as keyof typeof PROVIDER_META];
    if (meta?.local) return t("providers.onDevice");
    return t("providers.noKey");
  };

  const handleValidate = async (providerId: string) => {
    setValidating(providerId);
    try {
      const result = await onValidate(providerId);
      if (result.valid) {
        try {
          const models = await onFetchModels(providerId);
          setModelCounts((prev) => ({ ...prev, [providerId]: models.length }));
          setNotice(t("provider.key.fetchingModels", { count: String(models.length) }));
        } catch {
          setNotice(result.message ?? t("providers.active"));
        }
      } else {
        setNotice(result.message ?? "Invalid credentials");
      }
    } catch (e) {
      setNotice(String(e));
    } finally {
      setValidating(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>{t("providers.title")}</h1>
        <p>{t("providers.subtitle")}</p>
      </div>
      <div className="page-scroll">
        <div className="page-canvas">
          {error && <p className="modal-error">{error}</p>}
          {notice && <p className="settings-toast">{notice}</p>}
          {loading && <p className="modal-desc">{t("providers.loading")}</p>}

          <div className="section">
            <span className="sec-label">{t("providers.routing")}</span>
            <div className="routegrid">
              {ROUTING_POLICIES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`routecard${routingPolicy === r.id ? " sel" : ""}`}
                  onClick={() => onSelectPolicy(r.id)}
                >
                  <span className="ro" />
                  <div>
                    <div className="rt">{t(`routing.${r.id}.title` as Parameters<typeof t>[0])}</div>
                    <div className="rs">{t(`routing.${r.id}.subtitle` as Parameters<typeof t>[0])}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <span className="sec-label">{t("providers.section")}</span>
            <div className="panel">
              {providers.map((p) => {
                const meta = PROVIDER_META[p.providerId as keyof typeof PROVIDER_META];
                return (
                  <div key={p.providerId} className="panel-row">
                    <div className="prov-logo" style={{ background: meta?.color ?? "#645d4e" }}>
                      {meta?.logo ?? "?"}
                    </div>
                    <div className="prov-meta">
                      <div className="prov-name">
                        {p.displayName}
                        {p.enabled && p.hasSecret && <span className="tag ok">{t("providers.active")}</span>}
                        {meta?.local && <span className="tag local">{t("providers.local")}</span>}
                        {p.keyFingerprint && <span className="tag ok">…{p.keyFingerprint}</span>}
                      </div>
                      <div className="prov-sub">
                        {statusLabel(p)}
                        {p.validationStatus !== "unknown" && ` · ${p.validationStatus}`}
                      </div>
                    </div>
                    <div className="prov-actions">
                      <button type="button" className="chip-btn" onClick={() => onConfigure(p.providerId)}>
                        <Icon name="key-round" size={14} />
                        {t("providers.keyBtn")}
                      </button>
                      <button
                        type="button"
                        className="chip-btn"
                        disabled={validating === p.providerId || !p.hasSecret}
                        onClick={() => void handleValidate(p.providerId)}
                      >
                        <Icon name="cpu" size={14} />
                        {t("providers.testBtn")}
                      </button>
                      <div
                        className={`toggle${p.enabled ? " on" : ""}`}
                        role="switch"
                        aria-checked={p.enabled}
                        tabIndex={0}
                        onClick={() => onToggleProvider(p.providerId, !p.enabled)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            onToggleProvider(p.providerId, !p.enabled);
                          }
                        }}
                      >
                        <i />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
