import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@aura-os/ui";

interface ToolCreatorProps {
  isAr?: boolean;
  projectId: string | null;
  editingTool?: any | null;
  onSuccess: (message: string) => void;
  onCancel: () => void;
}

const TEMPLATES = [
  {
    id: "api",
    nameAr: "قالب جلب البيانات (API Fetch)",
    nameEn: "API Fetch Template",
    code: `import { tool } from "@aura-os/plugin";
import axios from "axios";

export default tool({
  description: "Fetches current weather for a city",
  args: {
    city: tool.schema.string().describe("Name of the city (e.g., Riyadh)"),
  },
  execute: async ({ city }) => {
    try {
      const response = await axios.get(\`https://wttr.in/\${encodeURIComponent(city)}?format=3\`);
      return response.data.trim();
    } catch (err) {
      throw new Error(\`Failed to fetch weather for \${city}: \${err}\`);
    }
  }
});`
  },
  {
    id: "file",
    nameAr: "قالب معالجة الملفات (File Utils)",
    nameEn: "File Utils Template",
    code: `import { tool } from "@aura-os/plugin";
import fs from "fs-extra";
import path from "path";

export default tool({
  description: "Checks if a file exists and displays its metadata",
  args: {
    filePath: tool.schema.string().describe("Relative path to the file"),
  },
  execute: async ({ filePath }, context) => {
    const fullPath = path.resolve(context.directory, filePath);
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      return \`File does not exist at path: \${filePath}\`;
    }
    const stat = await fs.stat(fullPath);
    return \`File found! Size: \${stat.size} bytes, Created: \${stat.birthtime}\`;
  }
});`
  }
];

export function ToolCreator({
  isAr = false,
  projectId,
  editingTool = null,
  onSuccess,
  onCancel,
}: ToolCreatorProps) {
  const [name, setName] = useState("");
  const [isLocal, setIsLocal] = useState(true);
  const [code, setCode] = useState(TEMPLATES[0].code);

  const [sandboxArgs, setSandboxArgs] = useState('{\n  "city": "Riyadh"\n}');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTool) {
      setName(editingTool.name);
      // Determine if local or global by path
      setIsLocal(editingTool.filePath.includes(".aura/tools") || editingTool.filePath.includes(".aura\\tools"));
      
      // Load current code
      invoke<string>("read_text_file", { path: editingTool.filePath })
        .then((content) => {
          setCode(content);
        })
        .catch((err) => {
          setError(String(err));
        });
    }
  }, [editingTool]);

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    if (window.confirm(isAr ? "هل أنت متأكد من استبدال الكود الحالي بالقالب؟" : "Are you sure you want to replace current code with template?")) {
      setCode(tpl.code);
    }
  };

  const handleRunSandbox = async () => {
    setSandboxLoading(true);
    setSandboxResult(null);
    setSandboxError(null);
    try {
      // First parse sandbox arguments
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(sandboxArgs);
      } catch (err: any) {
        throw new Error(isAr ? `خطأ في صياغة JSON للوسائط: ${err.message}` : `Invalid JSON in arguments: ${err.message}`);
      }

      // Save temporary version or compile it
      const savedPath = await invoke<string>("save_custom_tool", {
        projectId: isLocal ? projectId : null,
        name: `__sandbox_${name || "temp"}`,
        content: code,
      });

      // Execute test
      const testRes: any = await invoke("test_custom_tool", {
        projectId,
        filePath: savedPath,
        arguments: parsedArgs,
      });

      // Cleanup sandbox temp tool file
      await invoke("delete_custom_tool", { filePath: savedPath });

      if (testRes.error) {
        setSandboxError(testRes.error);
      } else {
        setSandboxResult(testRes.output);
      }
    } catch (err: any) {
      setSandboxError(err.message || String(err));
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(isAr ? "يرجى إدخال اسم الأداة" : "Please enter tool name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await invoke("save_custom_tool", {
        projectId: isLocal ? projectId : null,
        name: name.trim(),
        content: code,
      });
      onSuccess(isAr ? "تم حفظ الأداة بنجاح" : "Tool saved successfully");
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="panel cloud-form"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 20,
        background: "var(--bg-2)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--border-3)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="braces" size={17} />
          {editingTool 
            ? (isAr ? `تعديل الأداة المخصصة: ${editingTool.name}` : `Edit Custom Tool: ${editingTool.name}`)
            : (isAr ? "إنشاء أداة مخصصة جديدة" : "Create New Custom Tool")}
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

      {error && <div className="banner err">{error}</div>}

      {/* Basic Meta */}
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>{isAr ? "اسم الأداة (بالإنجليزية)" : "Tool Name (alphanumeric)"}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
            placeholder="e.g. fetch_weather"
            disabled={!!editingTool}
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border-3)",
              padding: "8px 12px",
              borderRadius: "var(--r-sm)",
              color: "var(--fg-1)",
              font: "inherit"
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>{isAr ? "مكان الحفظ" : "Save Location"}</span>
          <select
            value={isLocal ? "local" : "global"}
            onChange={(e) => setIsLocal(e.target.value === "local")}
            disabled={!!editingTool}
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border-3)",
              padding: "8px 12px",
              borderRadius: "var(--r-sm)",
              color: "var(--fg-1)",
              font: "inherit"
            }}
          >
            <option value="local">{isAr ? "محلّي للمشروع (.aura/tools)" : "Local to Project (.aura/tools)"}</option>
            <option value="global">{isAr ? "عالمي للنظام (~/.config/aura/tools)" : "Global (~/.config/aura/tools)"}</option>
          </select>
        </label>
      </div>

      {/* Templates */}
      {!editingTool && (
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Icon name="sparkles" size={12} />
                {isAr ? tpl.nameAr : tpl.nameEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Code Editor */}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span>{isAr ? "كود الأداة (TypeScript)" : "Tool Implementation Code (TypeScript)"}</span>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={12}
          style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border-3)",
            padding: "12px",
            borderRadius: "var(--r-sm)",
            color: "var(--fg-1)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "13px",
            resize: "vertical",
            lineHeight: "1.5"
          }}
        />
      </label>

      {/* Sandbox Test */}
      <div style={{ border: "1px solid var(--border-3)", borderRadius: "var(--r-sm)", padding: 14, background: "rgba(255, 255, 255, 0.02)" }}>
        <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--fg-1)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="monitor" size={15} />
          {isAr ? "بيئة التشغيل التجريبي (Sandbox)" : "Sandbox Testing Panel"}
        </div>
        
        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {isAr ? "الوسائط التجريبية بصيغة JSON" : "Mock Arguments (JSON)"}
          </span>
          <textarea
            value={sandboxArgs}
            onChange={(e) => setSandboxArgs(e.target.value)}
            rows={4}
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border-3)",
              padding: "8px 12px",
              borderRadius: "var(--r-sm)",
              color: "var(--fg-1)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "12px"
            }}
          />
        </label>

        <button
          type="button"
          className="btn secondary sm"
          disabled={sandboxLoading || !name.trim()}
          onClick={handleRunSandbox}
        >
          {sandboxLoading ? (isAr ? "جاري التجربة..." : "Running...") : (isAr ? "تشغيل التجربة" : "Run Sandbox Test")}
        </button>

        {sandboxResult && (
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: "12px", color: "var(--success)", fontWeight: 600 }}>{isAr ? "النتيجة:" : "Result:"}</span>
            <pre style={{ background: "var(--bg-inset)", border: "1px solid var(--border-3)", padding: "10px", borderRadius: 4, fontFamily: "var(--font-mono, monospace)", fontSize: "12px", overflowX: "auto", whiteSpace: "pre-wrap", color: "var(--fg-2)" }}>
              {sandboxResult}
            </pre>
          </div>
        )}

        {sandboxError && (
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: "12px", color: "var(--danger)", fontWeight: 600 }}>{isAr ? "خطأ التشغيل:" : "Execution Error:"}</span>
            <pre style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "10px", borderRadius: 4, fontFamily: "var(--font-mono, monospace)", fontSize: "12px", overflowX: "auto", whiteSpace: "pre-wrap", color: "var(--danger)" }}>
              {sandboxError}
            </pre>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="form-actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
        <button
          type="button"
          className="btn primary sm"
          disabled={loading || !name.trim()}
          onClick={handleSave}
        >
          {loading ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ وتثبيت الأداة" : "Save and Install Tool")}
        </button>
        <button
          type="button"
          className="btn secondary sm"
          onClick={onCancel}
        >
          {isAr ? "إلغاء" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
