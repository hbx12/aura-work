import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface ReadinessResult {
  app: {
    desktopRunning: boolean;
    sidecarHealthy: boolean;
    vmHelperRunning: boolean;
    browserHelperRunning: boolean;
    pluginsHelperRunning: boolean;
    vaultConfigured: boolean;
  };
  project: {
    gitDetected: boolean;
    profileConfigured: boolean;
    commandsConfigured: boolean;
    rulesFilePresent: boolean;
    rollbackSupported: boolean;
  };
  security: {
    safeModeActive: boolean;
    permissionPolicy: string;
    shellGated: boolean;
    deleteGated: boolean;
  };
}

interface ReadinessPageProps {
  projectId: string;
  isArabic?: boolean;
}

export function ReadinessPage({ projectId, isArabic }: ReadinessPageProps) {
  const [data, setData] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReadiness();
  }, [projectId]);

  const loadReadiness = async () => {
    setLoading(true);
    try {
      const res = await invoke<ReadinessResult>("run_readiness_checks", { projectId });
      setData(res);
    } catch (e) {
      console.error("Failed to load readiness checks", e);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusDot = (val: boolean) => {
    return (
      <span style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: val ? "#10b981" : "#ef4444",
        boxShadow: val ? "0 0 8px #10b981" : "0 0 8px #ef4444"
      }} />
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: "14px" }}>
        {isArabic ? "جاري تشغيل فحوصات الجاهزية..." : "Running system readiness checks..."}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{
      padding: "24px",
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "16px",
      color: "var(--text-1)",
      display: "flex",
      flexDirection: "column",
      gap: "24px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
            🛡️ {isArabic ? "جاهزية النظام وبيئة العمل" : "System & Project Readiness"}
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            {isArabic ? "تحقق مما إذا كانت الأدوات والسياسات الأمنية جاهزة لعمل الوكيل." : "Verify if app components and security controls are ready for agent tasks."}
          </p>
        </div>
        <button className="btn sm primary" onClick={loadReadiness}>
          🔄 {isArabic ? "تحديث" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        {/* App Health */}
        <div style={{ padding: "16px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "10px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "bold", borderBottom: "1px solid var(--border-1)", paddingBottom: "6px" }}>
            🔌 {isArabic ? "صحة التطبيق والخدمات" : "App Health & Services"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "تطبيق سطح المكتب" : "Desktop Application"}</span>
              {renderStatusDot(data.app.desktopRunning)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "الوكيل الجانبي (Sidecar)" : "Agent Sidecar"}</span>
              {renderStatusDot(data.app.sidecarHealthy)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "مساعد البيئة الافتراضية VM" : "VM Helper"}</span>
              {renderStatusDot(data.app.vmHelperRunning)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "مساعد المتصفح" : "Browser Helper"}</span>
              {renderStatusDot(data.app.browserHelperRunning)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "مساعد الإضافات" : "Plugins Helper"}</span>
              {renderStatusDot(data.app.pluginsHelperRunning)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "خزنة المفاتيح الآمنة" : "Vault Configuration"}</span>
              {renderStatusDot(data.app.vaultConfigured)}
            </div>
          </div>
        </div>

        {/* Project Readiness */}
        <div style={{ padding: "16px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "10px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "bold", borderBottom: "1px solid var(--border-1)", paddingBottom: "6px" }}>
            📁 {isArabic ? "جاهزية المشروع" : "Project Readiness"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "مستودع Git" : "Git Repository"}</span>
              {renderStatusDot(data.project.gitDetected)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "تعريف بيئة المشروع" : "Project Profile"}</span>
              {renderStatusDot(data.project.profileConfigured)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "تأكيد أوامر البناء/الاختبار" : "Project Commands"}</span>
              {renderStatusDot(data.project.commandsConfigured)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "ملف قواعد المشروع AURA.md" : "Project Rules File (AURA.md)"}</span>
              {renderStatusDot(data.project.rulesFilePresent)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "دعم التراجع والاستعادة" : "Rollback/Snapshot Support"}</span>
              {renderStatusDot(data.project.rollbackSupported)}
            </div>
          </div>
        </div>

        {/* Security Controls */}
        <div style={{ padding: "16px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "10px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "bold", borderBottom: "1px solid var(--border-1)", paddingBottom: "6px" }}>
            🔒 {isArabic ? "السياسات الأمنية" : "Security & Policies"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "تفعيل الوضع الآمن" : "Safe Mode Enabled"}</span>
              {renderStatusDot(data.security.safeModeActive)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "سياسة الصلاحيات الحالية" : "Permission Policy"}</span>
              <span style={{ fontSize: "12px", fontWeight: "bold", color: "#60a5fa", background: "rgba(59, 130, 246, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                {data.security.permissionPolicy}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "بوابة أوامر الطرفية" : "Shell Commands Gating"}</span>
              {renderStatusDot(data.security.shellGated)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
              <span>{isArabic ? "بوابة حذف الملفات" : "File Deletions Gating"}</span>
              {renderStatusDot(data.security.deleteGated)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
