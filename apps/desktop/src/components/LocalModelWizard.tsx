import { useState } from "react";
import { Icon } from "@aura-os/ui";

interface LocalModelWizardProps {
  isArabic?: boolean;
  onClose: () => void;
}

export function LocalModelWizard({ isArabic, onClose }: LocalModelWizardProps) {
  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "checking" | "connected" | "failed">("idle");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [lmStudioStatus, setLmStudioStatus] = useState<"idle" | "checking" | "connected" | "failed">("idle");
  const [lmStudioModels, setLmStudioModels] = useState<string[]>([]);

  const testOllama = async () => {
    setOllamaStatus("checking");
    try {
      // We make a request to Ollama endpoint
      const res = await fetch("http://127.0.0.1:11434/api/tags");
      if (res.ok) {
        const data = await res.json();
        const names = data.models?.map((m: any) => m.name) || [];
        setOllamaModels(names);
        setOllamaStatus("connected");
      } else {
        setOllamaStatus("failed");
      }
    } catch {
      setOllamaStatus("failed");
    }
  };

  const testLmStudio = async () => {
    setLmStudioStatus("checking");
    try {
      const res = await fetch("http://127.0.0.1:1234/v1/models");
      if (res.ok) {
        const data = await res.json();
        const names = data.data?.map((m: any) => m.id) || [];
        setLmStudioModels(names);
        setLmStudioStatus("connected");
      } else {
        setLmStudioStatus("failed");
      }
    } catch {
      setLmStudioStatus("failed");
    }
  };

  return (
    <div style={{
      padding: "24px",
      background: "var(--bg-2)",
      border: "1px solid var(--border-1)",
      borderRadius: "16px",
      color: "var(--text-1)",
      maxWidth: "600px",
      margin: "0 auto",
      boxShadow: "0 8px 30px rgba(0,0,0,0.2)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
          <Icon name="bot" size={18} style={{ verticalAlign: "-3px", marginInlineEnd: 8 }} />
          {isArabic ? "مساعد إعداد النماذج المحلية" : "Local Model Setup Helper"}
        </h3>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px" }}>&times;</button>
      </div>

      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: "1.5" }}>
        {isArabic
          ? "يدعم Aura العمل بدون اتصال إنترنت وبخصوصية تامة عبر تشغيل نماذج الذكاء الاصطناعي محلياً على جهازك باستخدام Ollama أو LM Studio."
          : "Aura supports running 100% offline and privacy-first by connecting to local AI models running on your machine via Ollama or LM Studio."}
      </p>

      {/* Ollama Section */}
      <div style={{ padding: "16px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "10px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>Ollama</h4>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>http://127.0.0.1:11434</span>
          </div>
          <button className="btn sm primary" onClick={testOllama} disabled={ollamaStatus === "checking"}>
            {ollamaStatus === "checking" ? (isArabic ? "جاري الفحص..." : "Testing...") : (isArabic ? "اختبار الاتصال" : "Test Connection")}
          </button>
        </div>

        {ollamaStatus === "connected" && (
          <div style={{ padding: "8px 12px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", fontSize: "12px", color: "#34d399" }}>
            <Icon name="check" size={14} style={{ verticalAlign: "-3px", marginInlineEnd: 6 }} />
            {isArabic ? `متصل! تم العثور على (${ollamaModels.length}) نموذج:` : `Connected! Found (${ollamaModels.length}) models:`}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
              {ollamaModels.map((m) => (
                <span key={m} style={{ padding: "2px 6px", background: "var(--bg-4)", borderRadius: "4px", fontSize: "11px", color: "var(--text-2)" }}>{m}</span>
              ))}
            </div>
          </div>
        )}

        {ollamaStatus === "failed" && (
          <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", fontSize: "12px", color: "#f87171" }}>
            <Icon name="alert-triangle" size={14} style={{ verticalAlign: "-3px", marginInlineEnd: 6 }} />
            {isArabic ? "فشل الاتصال بـ Ollama. تأكد من تشغيل تطبيق Ollama على جهازك." : "Failed to connect to Ollama. Make sure the Ollama app is running."}
          </div>
        )}
      </div>

      {/* LM Studio Section */}
      <div style={{ padding: "16px", background: "var(--bg-3)", border: "1px solid var(--border-2)", borderRadius: "10px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>LM Studio</h4>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>http://127.0.0.1:1234</span>
          </div>
          <button className="btn sm primary" onClick={testLmStudio} disabled={lmStudioStatus === "checking"}>
            {lmStudioStatus === "checking" ? (isArabic ? "جاري الفحص..." : "Testing...") : (isArabic ? "اختبار الاتصال" : "Test Connection")}
          </button>
        </div>

        {lmStudioStatus === "connected" && (
          <div style={{ padding: "8px 12px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", fontSize: "12px", color: "#34d399" }}>
            <Icon name="check" size={14} style={{ verticalAlign: "-3px", marginInlineEnd: 6 }} />
            {isArabic ? "متصل بـ LM Studio!" : "Connected to LM Studio!"}
            {lmStudioModels.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                {lmStudioModels.map((m) => (
                  <span key={m} style={{ padding: "2px 6px", background: "var(--bg-4)", borderRadius: "4px", fontSize: "11px", color: "var(--text-2)" }}>{m}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {lmStudioStatus === "failed" && (
          <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", fontSize: "12px", color: "#f87171" }}>
            <Icon name="alert-triangle" size={14} style={{ verticalAlign: "-3px", marginInlineEnd: 6 }} />
            {isArabic ? "فشل الاتصال بـ LM Studio. تأكد من تفعيل Local Server داخل LM Studio." : "Failed to connect to LM Studio. Make sure Local Server is running in LM Studio."}
          </div>
        )}
      </div>

      {/* Suggested Models */}
      <div style={{ background: "rgba(0,0,0,0.15)", padding: "14px", borderRadius: "8px" }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--text-1)" }}>
          <Icon name="sparkles" size={14} style={{ verticalAlign: "-3px", marginInlineEnd: 6 }} />
          {isArabic ? "النماذج المحلية المقترحة للتطوير:" : "Recommended Local Models for Coding:"}
        </h4>
        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>
            <strong>deepseek-coder:6.7b</strong> - {isArabic ? "أقوى نموذج صغير لبرمجة وتعديل الأكواد." : "Outstanding small model for coding and code modification."}
          </li>
          <li>
            <strong>llama3.1:8b</strong> - {isArabic ? "نموذج عام ممتاز ولديه قدرات منطقية جيدة." : "Excellent general-purpose model with good reasoning abilities."}
          </li>
          <li>
            <strong>qwen2.5-coder:7b</strong> - {isArabic ? "نموذج سريع وممتاز جداً في لغات برمجة متعددة." : "Very fast and excellent model across multiple languages."}
          </li>
        </ul>
      </div>
    </div>
  );
}
