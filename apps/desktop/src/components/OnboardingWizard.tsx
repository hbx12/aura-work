import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface ProjectProfile {
  projectId: string;
  framework: string | null;
  language: string | null;
  packageManager: string | null;
  commands: Record<string, string>;
  status: Record<string, string>;
  confidence: string;
  gitStatus: string;
  readmeExists: boolean;
}

interface OnboardingWizardProps {
  projectId: string;
  onClose: () => void;
  onConfirmed?: () => void;
  isArabic?: boolean;
}

export function OnboardingWizard({ projectId, onClose, onConfirmed, isArabic }: OnboardingWizardProps) {
  const [profile, setProfile] = useState<ProjectProfile | null>(null);
  const [editingCommand, setEditingCommand] = useState<string | null>(null);
  const [commandValue, setCommandValue] = useState("");
  const [testResult, setTestResult] = useState<{ key: string; success: boolean; output: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [projectId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await invoke<ProjectProfile>("get_project_profile", { projectId });
      setProfile(res);
    } catch (e) {
      console.error("Failed to load project profile", e);
    } finally {
      setLoading(false);
    }
  };

  const handleScanDeeper = async () => {
    setLoading(true);
    try {
      const res = await invoke<ProjectProfile>("detect_project_profile", { projectId });
      setProfile(res);
    } catch (e) {
      alert("Error scanning project: " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommand = () => {
    if (!profile || !editingCommand) return;
    const updated = {
      ...profile,
      commands: {
        ...profile.commands,
        [editingCommand]: commandValue,
      },
    };
    setProfile(updated);
    setEditingCommand(null);
  };

  const handleTestCommand = async (key: string) => {
    if (!profile) return;
    setTestingKey(key);
    setTestResult(null);
    try {
      const cmd = profile.commands[key];
      const res = await invoke<{ stdout: string; stderr: string; success: boolean }>(
        "test_project_command",
        { projectId, commandStr: cmd }
      );
      setTestResult({
        key,
        success: res.success,
        output: res.success ? res.stdout : res.stderr || res.stdout,
      });
    } catch (e) {
      setTestResult({
        key,
        success: false,
        output: String(e),
      });
    } finally {
      setTestingKey(null);
    }
  };

  const handleConfirm = async () => {
    if (!profile) return;
    try {
      const confirmedProfile = {
        ...profile,
        confidence: "high",
      };
      await invoke("save_project_profile", { profile: confirmedProfile });
      onConfirmed?.();
      onClose();
    } catch (e) {
      alert("Error saving profile: " + e);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-wizard-card" style={{ padding: "20px", background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: "12px", marginBottom: "16px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
          {isArabic ? "جاري فحص وتحديد بيئة العمل..." : "Scanning workspace and detecting profile..."}
        </p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="onboarding-wizard-card" style={{
      padding: "24px",
      background: "linear-gradient(135deg, var(--bg-2) 0%, var(--bg-3) 100%)",
      border: "1px solid var(--border-highlight, var(--border-2))",
      borderRadius: "16px",
      marginBottom: "20px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "var(--text-1)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>⚡</span>
            {isArabic ? "اكتشفت أورا بيئة عمل مشروعك" : "Aura Detected Your Project Profile"}
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            {isArabic ? "أكد بيئة العمل والأوامر حتى يتسنى للوكيل العمل بذكاء." : "Confirm your tech stack and commands so the agent can execute tasks accurately."}
          </p>
        </div>
        <button className="icon-btn" onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}>&times;</button>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ padding: "6px 12px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "20px", fontSize: "12px", color: "#60a5fa" }}>
          <strong>{isArabic ? "الإطار:" : "Framework:"}</strong> {profile.framework || (isArabic ? "غير معروف" : "Unknown")}
        </div>
        <div style={{ padding: "6px 12px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "20px", fontSize: "12px", color: "#34d399" }}>
          <strong>{isArabic ? "اللغة:" : "Language:"}</strong> {profile.language || (isArabic ? "غير معروف" : "Unknown")}
        </div>
        <div style={{ padding: "6px 12px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "20px", fontSize: "12px", color: "#fbbf24" }}>
          <strong>{isArabic ? "مدير الحزم:" : "Package Manager:"}</strong> {profile.packageManager || (isArabic ? "غير معروف" : "Unknown")}
        </div>
        <div style={{ padding: "6px 12px", background: "rgba(236, 72, 153, 0.1)", border: "1px solid rgba(236, 72, 153, 0.3)", borderRadius: "20px", fontSize: "12px", color: "#f472b6" }}>
          <strong>Git:</strong> {profile.gitStatus === "detected" ? (isArabic ? "مفعل" : "Detected") : (isArabic ? "غير مفعل" : "Not Detected")}
        </div>
      </div>

      <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "12px", marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "var(--text-1)" }}>
          {isArabic ? "أوامر المشروع الذكية" : "Project Smart Commands"}
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Object.entries(profile.commands).map(([key, cmd]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg-4)", borderRadius: "6px", border: "1px solid var(--border-2)" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", textTransform: "capitalize", color: "var(--text-2)" }}>{key}:</span>
              {editingCommand === key ? (
                <div style={{ display: "flex", gap: "8px", flex: 1, marginLeft: "12px", marginRight: "12px" }}>
                  <input
                    type="text"
                    value={commandValue}
                    onChange={(e) => setCommandValue(e.target.value)}
                    style={{ flex: 1, padding: "4px 8px", background: "var(--bg-1)", border: "1px solid var(--border-highlight)", color: "var(--text-1)", borderRadius: "4px", fontSize: "12px" }}
                  />
                  <button className="btn sm primary" onClick={handleSaveCommand}>{isArabic ? "حفظ" : "Save"}</button>
                  <button className="btn sm secondary" onClick={() => setEditingCommand(null)}>{isArabic ? "إلغاء" : "Cancel"}</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <code style={{ fontSize: "12px", color: "var(--text-muted)" }}>{cmd}</code>
                  <button
                    className="chip-btn"
                    onClick={() => {
                      setEditingCommand(key);
                      setCommandValue(cmd);
                    }}
                    style={{ fontSize: "11px", padding: "2px 6px" }}
                  >
                    {isArabic ? "تعديل" : "Edit"}
                  </button>
                  <button
                    className="chip-btn"
                    disabled={testingKey !== null}
                    onClick={() => handleTestCommand(key)}
                    style={{ fontSize: "11px", padding: "2px 6px", background: testingKey === key ? "var(--bg-3)" : "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}
                  >
                    {testingKey === key ? (isArabic ? "جاري الفحص..." : "Testing...") : (isArabic ? "اختبار" : "Test")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {testResult && (
        <div style={{ padding: "12px", background: testResult.success ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", borderLeft: `4px solid ${testResult.success ? "#10b981" : "#ef4444"}`, borderRadius: "4px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: testResult.success ? "#34d399" : "#f87171" }}>
              {isArabic ? `نتيجة اختبار أمر (${testResult.key}):` : `Test result for (${testResult.key}):`} {testResult.success ? (isArabic ? "نجح" : "Success") : (isArabic ? "فشل" : "Failed")}
            </span>
            <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px" }} onClick={() => setTestResult(null)}>{isArabic ? "إغلاق" : "Close"}</button>
          </div>
          <pre style={{ margin: 0, padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "4px", fontSize: "11px", overflowX: "auto", maxHeight: "150px", color: "var(--text-muted)" }}>
            {testResult.output}
          </pre>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button className="btn sm secondary" onClick={handleScanDeeper}>{isArabic ? "إعادة الفحص العميق" : "Scan Deeper"}</button>
        <button className="btn sm secondary" onClick={onClose}>{isArabic ? "تخطي" : "Skip"}</button>
        <button className="btn sm primary" onClick={handleConfirm}>{isArabic ? "تأكيد واستمرار" : "Confirm & Continue"}</button>
      </div>
    </div>
  );
}
