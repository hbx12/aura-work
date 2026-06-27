import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SkillCreatorProps {
  isAr?: boolean;
  onSuccess: (message: string) => void;
  onCancel: () => void;
}

interface Template {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  roleEn: string;
  roleAr: string;
  rulesEn: string[];
  rulesAr: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "reviewer",
    nameEn: "Code Reviewer",
    nameAr: "مراجع الأكواد",
    descEn: "Reviews code files for bugs, security risks, and optimization opportunities.",
    descAr: "مراجعة ملفات الأكواد البرمجية للبحث عن الأخطاء والمخاطر الأمنية وفرص التحسين.",
    roleEn: "You are a professional code review assistant. Your focus is to analyze git diffs or raw files and suggest code quality improvements.",
    roleAr: "أنت مساعد مراجعة أكواد محترف. تركيزك هو تحليل فروقات الأكواد أو الملفات البرمجية واقتراح تحسينات جودة الكود.",
    rulesEn: [
      "Analyze memory management and resource leaks.",
      "Check compliance with language best practices.",
      "Highlight potential security vulnerabilities.",
    ],
    rulesAr: [
      "تحليل إدارة الذاكرة وتسرب الموارد.",
      "التحقق من التوافق مع أفضل ممارسات لغة البرمجة.",
      "تسليط الضوء على الثغرات الأمنية المحتملة.",
    ],
  },
  {
    id: "tester",
    nameEn: "Unit Test Writer",
    nameAr: "كاتب اختبارات الوحدة",
    descEn: "Generates robust unit tests with high edge-case coverage.",
    descAr: "إنشاء اختبارات وحدة قوية تغطي الحالات الخاصة والحدية.",
    roleEn: "You are an automated testing specialist. Your job is to read source code functions and generate complete unit tests.",
    roleAr: "أنت أخصائي اختبار برمجيات تلقائي. وظيفتك هي قراءة الدوال البرمجية وإنشاء اختبارات وحدة كاملة.",
    rulesEn: [
      "Use mocks for external network and database calls.",
      "Test boundary conditions and empty inputs.",
      "Include assertions for error states and exceptions.",
    ],
    rulesAr: [
      "استخدم المحاكاة (Mocks) للاتصالات الخارجية بقاعدة البيانات والشبكة.",
      "اختبر الشروط الحدية والمدخلات الفارغة.",
      "قم بتضمين اختبارات لحالات الخطأ والاستثناءات.",
    ],
  },
  {
    id: "auditor",
    nameEn: "Security Auditor",
    nameAr: "مدقق الأمان",
    descEn: "Inspects code specifically for OWASP hazards, injections, and auth flaws.",
    descAr: "فحص الأكواد بشكل خاص بحثاً عن مخاطر OWASP، حقن الأكواد، وثغرات التحقق من الهوية.",
    roleEn: "You are a senior security researcher. Audit the provided code specifically for security vulnerabilities.",
    roleAr: "أنت باحث أمني أول. قم بتدقيق الكود المقدم خصيصاً للبحث عن الثغرات الأمنية.",
    rulesEn: [
      "Check for SQL/Command injection risks.",
      "Flag hardcoded API keys and secrets.",
      "Audit authorization and permission boundaries.",
    ],
    rulesAr: [
      "التحقق من مخاطر حقن SQL/الأوامر.",
      "تحديد مفاتيح الـ API والأسرار المشفرة يدوياً.",
      "تدقيق حدود التصاريح والصلاحيات.",
    ],
  },
];

export default function SkillCreator({ isAr, onSuccess, onCancel }: SkillCreatorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("");
  const [rules, setRules] = useState<string[]>([""]);
  const [outputFormat, setOutputFormat] = useState("");
  const [loading, setLoading] = useState(false);

  // Apply template
  const applyTemplate = (tpl: Template) => {
    setName(tpl.id);
    setDescription(isAr ? tpl.descAr : tpl.descEn);
    setRole(isAr ? tpl.roleAr : tpl.roleEn);
    setRules(isAr ? [...tpl.rulesAr] : [...tpl.rulesEn]);
    setOutputFormat(
      isAr
        ? "يرجى تقديم تقرير مفصل على شكل نقاط محددة مع أمثلة أكواد للتصحيح."
        : "Please provide a detailed bulleted checklist with code correction snippets."
    );
  };

  const handleAddRule = () => {
    setRules((prev) => [...prev, ""]);
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, val: string) => {
    setRules((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  // Generate the markdown prompt
  const generatedPrompt = React.useMemo(() => {
    let md = ``;
    if (role.trim()) {
      md += `### ${isAr ? "الدور والهدف" : "Role & Objective"}\n${role.trim()}\n\n`;
    }
    const activeRules = rules.filter((r) => r.trim() !== "");
    if (activeRules.length > 0) {
      md += `### ${isAr ? "القواعد والقيود" : "Rules & Constraints"}\n`;
      activeRules.forEach((rule) => {
        md += `- ${rule.trim()}\n`;
      });
      md += `\n`;
    }
    if (outputFormat.trim()) {
      md += `### ${isAr ? "صيغة المخرجات" : "Output Format"}\n${outputFormat.trim()}\n`;
    }
    return md.trim();
  }, [role, rules, outputFormat, isAr]);

  const handleSave = async () => {
    if (!name.trim() || !generatedPrompt.trim()) return;

    setLoading(true);
    // Sanitize name for ID (slug)
    const cleanName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-");

    try {
      await invoke("create_local_skill", {
        input: {
          name: cleanName,
          description: description.trim(),
          prompt: generatedPrompt,
        },
      });
      onSuccess(isAr ? "تم حفظ المهارة البصرية الجديدة بنجاح!" : "New visual skill saved successfully!");
    } catch (err) {
      alert(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 20,
        background: "rgba(255, 255, 255, 0.01)",
        border: "1px solid var(--border-2)",
        borderRadius: 16,
        backdropFilter: "blur(12px)",
        color: "var(--text-1)",
        fontFamily: "var(--font-family)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🛠️</span>
          {isAr ? "صانع المهارات البصري" : "Visual Skill Creator"}
        </h3>
        <button
          type="button"
          className="btn ghost sm"
          onClick={onCancel}
          style={{ padding: "4px 8px", minHeight: 0 }}
        >
          {isAr ? "إلغاء" : "Cancel"}
        </button>
      </div>

      {/* Templates Selector */}
      <div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: 8 }}>
          {isAr ? "اختر قالباً جاهزاً للبدء السريع:" : "Choose a template to start quickly:"}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="chip-btn"
              onClick={() => applyTemplate(tpl)}
              style={{
                padding: "6px 12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-3)",
                borderRadius: "20px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              🚀 {isAr ? tpl.nameAr : tpl.nameEn}
            </button>
          ))}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border-3)", margin: "4px 0" }} />

      {/* Editor & Preview Form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: Input Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "12px" }}>
              <span style={{ fontWeight: 600 }}>{isAr ? "معرّف المهارة (Slug)" : "Skill Identifier (Slug)"}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
                placeholder="my-cool-skill"
                style={{
                  background: "var(--bg-1)",
                  border: "1px solid var(--border-3)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  color: "var(--text-1)",
                  font: "inherit",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "12px" }}>
              <span style={{ fontWeight: 600 }}>{isAr ? "الوصف" : "Friendly Description"}</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this skill does"
                style={{
                  background: "var(--bg-1)",
                  border: "1px solid var(--border-3)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  color: "var(--text-1)",
                  font: "inherit",
                }}
              />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "12px" }}>
            <span style={{ fontWeight: 600 }}>{isAr ? "تعريف دور الوكيل" : "Agent Role Definition"}</span>
            <textarea
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. You are a senior frontend engineer reviewing styles..."
              rows={3}
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--border-3)",
                padding: "8px 12px",
                borderRadius: "8px",
                color: "var(--text-1)",
                font: "inherit",
                resize: "vertical",
              }}
            />
          </label>

          {/* Guidelines/Rules List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "12px", fontWeight: 600 }}>{isAr ? "قواعد السلوك والقيود" : "Behavioral Guidelines & Rules"}</span>
            {rules.map((rule, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={rule}
                  onChange={(e) => handleRuleChange(idx, e.target.value)}
                  placeholder={`Rule #${idx + 1}`}
                  style={{
                    flex: 1,
                    background: "var(--bg-1)",
                    border: "1px solid var(--border-3)",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    color: "var(--text-1)",
                    font: "inherit",
                  }}
                />
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => handleRemoveRule(idx)}
                  style={{ padding: 8, minHeight: 0, color: "var(--text-muted)" }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn secondary sm"
              onClick={handleAddRule}
              style={{ alignSelf: "flex-start", marginTop: 4, padding: "4px 10px", fontSize: "11px", minHeight: 0 }}
            >
              + {isAr ? "إضافة قاعدة" : "Add Guideline"}
            </button>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "12px" }}>
            <span style={{ fontWeight: 600 }}>{isAr ? "تنسيق مخرجات الاستجابة" : "Response Output Format"}</span>
            <input
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              placeholder="e.g. Return response formatted as a neat markdown table"
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--border-3)",
                padding: "8px 12px",
                borderRadius: "8px",
                color: "var(--text-1)",
                font: "inherit",
              }}
            />
          </label>
        </div>

        {/* Right: Real-time Markdown Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
            {isAr ? "معاينة الملف النهائي (Prompt Preview):" : "Generated MD Prompt Preview:"}
          </span>
          <div
            style={{
              flex: 1,
              background: "rgba(0,0,0,0.2)",
              border: "1px solid var(--border-3)",
              borderRadius: "10px",
              padding: "12px",
              fontSize: "12px",
              fontFamily: "monospace",
              color: "#a78bfa",
              whiteSpace: "pre-wrap",
              overflowY: "auto",
              maxHeight: "350px",
            }}
          >
            {generatedPrompt || (isAr ? "(الملف فارغ حالياً. املأ الحقول للمعاينة)" : "(Empty. Fill inputs to preview prompt)")}
          </div>
        </div>
      </div>

      {/* Footer Save Action */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
        <button
          type="button"
          className="btn secondary sm"
          onClick={onCancel}
        >
          {isAr ? "إلغاء" : "Cancel"}
        </button>
        <button
          type="button"
          className="btn primary sm"
          disabled={loading || !name.trim() || !generatedPrompt.trim()}
          onClick={handleSave}
        >
          {loading ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ المهارة البصرية" : "Save Visual Skill")}
        </button>
      </div>
    </div>
  );
}
