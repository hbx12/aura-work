import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface DiagnosticBundle {
  appVersion: string;
  osPlatform: string;
  osArch: string;
  sidecarStatus: any;
  vmStatus: any;
  browserStatus: any;
  pluginsStatus: any;
  recentLogs: string[];
}

interface DiagnosticsPageProps {
  isArabic?: boolean;
}

export function DiagnosticsPage({ isArabic }: DiagnosticsPageProps) {
  const [bundle, setBundle] = useState<DiagnosticBundle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await invoke<DiagnosticBundle>("get_diagnostic_bundle");
      setBundle(res);
    } catch (e) {
      console.error("Failed to load diagnostics bundle", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBundle = () => {
    if (!bundle) return;
    const jsonStr = JSON.stringify(bundle, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getFilteredLogs = () => {
    if (!bundle) return [];
    if (!searchQuery.trim()) return bundle.recentLogs;
    const query = searchQuery.toLowerCase();
    return bundle.recentLogs.filter((log) => log.toLowerCase().includes(query));
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: "14px" }}>
        {isArabic ? "جاري تجميع حزمة التشخيص والتحليل..." : "Generating diagnostic bundle..."}
      </div>
    );
  }

  if (!bundle) return null;

  const filteredLogs = getFilteredLogs();

  return (
    <div style={{
      padding: "24px",
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "16px",
      color: "var(--text-1)",
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
            📋 {isArabic ? "سجلات التشخيص والتحليل" : "Logs & Diagnostics"}
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            {isArabic ? "عرض سجلات الأخطاء الحية وتحميل حزمة التشخيص الآمنة." : "View active error logs and export a redacted diagnostic bundle."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn sm secondary" onClick={loadDiagnostics}>
            🔄 {isArabic ? "تحديث" : "Refresh"}
          </button>
          <button className="btn sm primary" onClick={handleCopyBundle}>
            {copied ? (isArabic ? "✓ تم النسخ!" : "✓ Copied!") : (isArabic ? "نسخ حزمة التشخيص" : "Copy Diagnostic Bundle")}
          </button>
        </div>
      </div>

      {/* Meta Specs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
        <div style={{ padding: "10px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "8px", fontSize: "12px" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>{isArabic ? "إصدار التطبيق" : "App Version"}</div>
          <strong style={{ color: "#60a5fa" }}>{bundle.appVersion}</strong>
        </div>
        <div style={{ padding: "10px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "8px", fontSize: "12px" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>{isArabic ? "نظام التشغيل" : "OS Platform"}</div>
          <strong style={{ color: "#34d399" }}>{bundle.osPlatform} ({bundle.osArch})</strong>
        </div>
        <div style={{ padding: "10px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "8px", fontSize: "12px" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>{isArabic ? "حالة Sidecar" : "Sidecar"}</div>
          <strong style={{ color: bundle.sidecarStatus.running ? "#34d399" : "#f87171" }}>
            {bundle.sidecarStatus.running ? (isArabic ? "نشط" : "Active") : (isArabic ? "متوقف" : "Offline")}
          </strong>
        </div>
        <div style={{ padding: "10px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "8px", fontSize: "12px" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>{isArabic ? "حالة VM" : "VM Helper"}</div>
          <strong style={{ color: bundle.vmStatus.running ? "#34d399" : "#f87171" }}>
            {bundle.vmStatus.running ? (isArabic ? "نشط" : "Active") : (isArabic ? "متوقف" : "Offline")}
          </strong>
        </div>
      </div>

      {/* Log Search */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          placeholder={isArabic ? "ابحث في السجلات..." : "Search logs..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", background: "var(--bg-3)", border: "1px solid var(--border-2)", color: "var(--text-1)", borderRadius: "8px", fontSize: "13px" }}
        />
      </div>

      {/* Logs Window */}
      <div style={{
        background: "#0d0e12",
        border: "1px solid var(--border-2)",
        borderRadius: "10px",
        padding: "16px",
        maxHeight: "350px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "6px"
      }} className="scroll-narrow">
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>
            {isArabic ? "لا توجد سجلات مطابقة للبحث." : "No logs matching the search criteria."}
          </div>
        ) : (
          filteredLogs.map((log, i) => (
            <div key={i} style={{
              fontFamily: "monospace",
              fontSize: "12px",
              lineHeight: "1.5",
              color: log.includes("failed") || log.includes("error") ? "#f87171" : "var(--text-muted)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}>
              {log}
            </div>
          ))
        )}
      </div>
      <span style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
        ⚠️ {isArabic ? "ملاحظة: يتم حجب وحذف جميع المفاتيح السرية والرموز تلقائياً من الملف للحفاظ على الخصوصية." : "Note: All API keys, passwords, and tokens are automatically redacted to protect your privacy."}
      </span>
    </div>
  );
}
