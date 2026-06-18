import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@aura-os/ui";
import type { TaskUsageRecord } from "@aura-os/shared";

interface MonthlySpending {
  month: string;
  total: number;
  byProvider: Record<string, number>;
}

interface UsagePageProps {
  projectId?: string | null;
  t: (key: string, params?: Record<string, string>) => string;
}

function fmtUsd(v: number): string {
  if (v === 0) return "$0.00";
  if (v < 0.0001) return "<$0.0001";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

export function UsagePage({ projectId, t }: UsagePageProps) {
  const [usage, setUsage] = useState<TaskUsageRecord[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await invoke<TaskUsageRecord[]>("list_task_usage", {
        projectId: projectId ?? null,
      });
      setUsage(records);

      const byMonth = new Map<string, Map<string, number>>();
      for (const r of records) {
        if (!r.estimatedCostUsd) continue;
        const m = (r.createdAt ?? "").slice(0, 7);
        if (!byMonth.has(m)) byMonth.set(m, new Map());
        const provMap = byMonth.get(m)!;
        provMap.set(r.providerId, (provMap.get(r.providerId) ?? 0) + r.estimatedCostUsd);
      }
      const arr: MonthlySpending[] = [];
      for (const [month, provMap] of byMonth) {
        let total = 0;
        const byProvider: Record<string, number> = {};
        for (const [p, v] of provMap) {
          total += v;
          byProvider[p] = v;
        }
        arr.push({ month, total, byProvider });
      }
      arr.sort((a, b) => a.month.localeCompare(b.month));
      setMonthlySpending(arr);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const currentMonth = monthlySpending.length > 0 ? monthlySpending[monthlySpending.length - 1] : null;
  const totalTokens = useMemo(() => {
    let inT = 0, outT = 0;
    for (const r of usage) {
      inT += r.inputTokens ?? 0;
      outT += r.outputTokens ?? 0;
    }
    return { input: inT, output: outT };
  }, [usage]);

  const byProvider = useMemo(() => {
    const map = new Map<string, { cost: number; tokens: number }>();
    for (const r of usage) {
      const entry = map.get(r.providerId) ?? { cost: 0, tokens: 0 };
      entry.cost += r.estimatedCostUsd ?? 0;
      entry.tokens += (r.inputTokens ?? 0) + (r.outputTokens ?? 0);
      map.set(r.providerId, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [usage]);

  const maxDayCost = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of usage) {
      if (!r.estimatedCostUsd || !r.createdAt) continue;
      const day = r.createdAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + r.estimatedCostUsd);
    }
    return Math.max(0.01, ...byDay.values());
  }, [usage]);

  const dailyData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of usage) {
      if (!r.estimatedCostUsd || !r.createdAt) continue;
      const day = r.createdAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + r.estimatedCostUsd);
    }
    return Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
  }, [usage]);

  const PROVIDER_COLORS: Record<string, string> = {
    openai: "#10a37f",
    anthropic: "#d97757",
    gemini: "#4285f4",
    deepseek: "#4f46e5",
    ollama: "#f59e0b",
    "openai-compatible": "#6366f1",
    minimax: "#ec4899",
    qwen: "#06b6d4",
    lmstudio: "#84cc16",
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("usage.title") || "Usage Dashboard"}</h1>
            <p>{t("usage.subtitle") || "API usage and spending across providers."}</p>
          </div>
        </div>
      </div>
      {error && (
        <div className="modal-error" style={{ margin: "12px 16px 0", borderRadius: "var(--r-sm)" }}>
          {error}
        </div>
      )}
      <div className="page-scroll">
        <div className="page-canvas">
          {loading && <p>{t("common.loading")}</p>}

          <div className="usage-summary">
            {currentMonth && (
              <div className="usage-card">
                <Icon name="database" size={18} />
                <span className="uc-label">{t("usage.monthSpend") || "This month"}</span>
                <span className="uc-value">{fmtUsd(currentMonth.total)}</span>
              </div>
            )}
            <div className="usage-card">
              <Icon name="database" size={18} />
              <span className="uc-label">{t("usage.inputTokens") || "Input tokens"}</span>
              <span className="uc-value">{fmtTokens(totalTokens.input)}</span>
            </div>
            <div className="usage-card">
              <Icon name="database" size={18} />
              <span className="uc-label">{t("usage.outputTokens") || "Output tokens"}</span>
              <span className="uc-value">{fmtTokens(totalTokens.output)}</span>
            </div>
            <div className="usage-card">
              <Icon name="list-checks" size={18} />
              <span className="uc-label">{t("usage.totalCalls") || "API calls"}</span>
              <span className="uc-value">{usage.length}</span>
            </div>
          </div>

          <div className="section">
            <span className="sec-label">{t("usage.dailySpend") || "Daily spending (last 30 days)"}</span>
            <div className="usage-chart">
              {dailyData.length === 0 ? (
                <p className="muted">{t("usage.noData") || "No usage data yet."}</p>
              ) : (
                dailyData.map(([day, cost]) => {
                  const pct = maxDayCost > 0 ? (cost / maxDayCost) * 100 : 0;
                  return (
                    <div key={day} className="usage-bar-row" title={`${day}: ${fmtUsd(cost)}`}>
                      <span className="ub-label">{day.slice(5)}</span>
                      <div className="ub-track">
                        <div className="ub-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="ub-value">{fmtUsd(cost)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {byProvider.length > 0 && (
            <div className="section">
              <span className="sec-label">{t("usage.byProvider") || "By provider"}</span>
              <div className="panel">
                {byProvider.map(([providerId, data]) => {
                  const pct = currentMonth && currentMonth.total > 0
                    ? (data.cost / currentMonth.total) * 100 : 0;
                  const color = PROVIDER_COLORS[providerId] || "#888";
                  return (
                    <div key={providerId} className="panel-row">
                      <div className="prov-meta">
                        <span className="up-dot" style={{ background: color }} />
                        <div className="prov-name">{providerId}</div>
                      </div>
                      <div className="up-bar-wrap">
                        <div className="up-bar" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="prov-costs">
                        <span>{fmtUsd(data.cost)}</span>
                        <span className="muted">{fmtTokens(data.tokens)} tok</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="section">
            <span className="sec-label">{t("usage.recent") || "Recent usage"}</span>
            <div className="panel">
              {usage.length === 0 ? (
                <div className="panel-row muted">{t("usage.noData") || "No records."}</div>
              ) : (
                usage.slice(0, 20).map((r) => (
                  <div key={r.id} className="panel-row">
                    <div className="prov-meta">
                      <span className="up-dot" style={{
                        background: PROVIDER_COLORS[r.providerId] || "#888",
                      }} />
                      <div className="prov-name">{r.providerId}/{r.modelId}</div>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <div className="prov-costs">
                      <span>
                        {r.estimatedCostUsd != null ? fmtUsd(r.estimatedCostUsd) : "—"}
                      </span>
                      <span className="muted">
                        {fmtTokens((r.inputTokens ?? 0) + (r.outputTokens ?? 0))} tok
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
