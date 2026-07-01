import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@aura-os/ui";
import type { MarketplaceEntry } from "@aura-os/shared";
import PermissionPreview from "./PermissionPreview";
import { localizedMarketplace } from "../../marketplace/localizeMarketplace";

interface InstallFlowModalProps {
  item: MarketplaceEntry;
  onClose: () => void;
  onInstalled: () => void;
  isAr?: boolean;
}

export default function InstallFlowModal({
  item,
  onClose,
  onInstalled,
  isAr,
}: InstallFlowModalProps) {
  const displayItem = localizedMarketplace(item, isAr);
  // Input fields state
  const [formData, setFormData] = useState<Record<string, string>>({});
  // Special instructions text for skill installation
  const [skillPromptText, setSkillPromptText] = useState(item.install?.prompt || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (item.type === "skill") {
        // Skill install flow: invoke create_local_skill
        await invoke("create_local_skill", {
          input: {
            id: item.id,
            name: item.name,
            description: item.description || item.summary || "",
            prompt: skillPromptText.trim(),
            enabled: true,
            path: null,
          },
        });
      } else if (item.type === "mcp") {
        // MCP install flow
        // 1. If there are credentials (like GITHUB_PERSONAL_ACCESS_TOKEN or DATABASE_URL), store them securely in the vault
        let secretValue: string | null = null;
        let secretFieldName: string | null = null;

        if (item.auth?.fields) {
          for (const f of item.auth.fields) {
            if (f.secret && formData[f.name]) {
              secretValue = formData[f.name];
              secretFieldName = f.name;
              break;
            }
          }
        }

        if (secretValue && secretFieldName) {
          // Store in vault under the server ID (e.g. mcp.github, mcp.postgres)
          await invoke("set_provider_secret", {
            input: {
              providerId: item.id,
              apiKey: secretValue,
              baseUrl: null,
              authMode: "pat",
            },
          });
        }

        // 2. Build final arguments list. Replace non-sensitive placeholders
        const rawArgs = item.install?.args || [];
        const finalArgs: string[] = [];

        for (const arg of rawArgs) {
          // If the argument is a secret placeholder like [DATABASE_URL] or [GITHUB_PERSONAL_ACCESS_TOKEN], 
          // we do NOT put the raw secret in SQLite arguments! The env injector handles it.
          if (arg === "[DATABASE_URL]" || arg === "[GITHUB_PERSONAL_ACCESS_TOKEN]") {
            continue; // Skip putting secret in command args
          }

          let resolvedArg = arg;
          // Replace other placeholders (e.g. [FOLDER_PATH], [SQLITE_PATH])
          if (item.auth?.fields) {
            for (const f of item.auth.fields) {
              if (!f.secret) {
                const val = formData[f.name] || "";
                resolvedArg = resolvedArg.replace(`[${f.name}]`, val);
              }
            }
          }
          finalArgs.push(resolvedArg);
        }

        // 3. Register the MCP server
        await invoke("add_mcp_server", {
          input: {
            id: item.id,
            name: item.name,
            command: item.install?.command || "npx",
            transport: item.install?.transport || "stdio",
            args: finalArgs,
            env: {},
          },
        });
      } else if (item.type === "plugin") {
        // Plugin install flow: placeholder or custom script execution
        setError(isAr ? "تثبيت الملحقات يتطلب تحميل كود الملحق وتثبيته محلياً حالياً." : "Installing direct plugins requires picking their local directories.");
        setLoading(false);
        return;
      }

      onInstalled();
      onClose();
    } catch (err) {
      console.error(err);
      setError(String(err));
      setLoading(false);
    }
  };

  const isHighRisk = item.risk === "high";
  const isMediumRisk = item.risk === "medium";

  return (
    <div className="modal-backdrop" style={{ alignItems: "center", justifyContent: "center" }}>
      <form
        className="modal"
        onSubmit={handleInstall}
        style={{
          width: "min(500px, 100%)",
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--r-lg)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          textAlign: isAr ? "right" : "left",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, color: "var(--fg-1)" }}>
            {isAr ? `تثبيت ${displayItem.name}` : `Install ${displayItem.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--fg-3)",
              cursor: "pointer",
            }}
          >
            <Icon name="x-mark" size={18} />
          </button>
        </div>

        {/* Security / Risk warnings */}
        {isHighRisk && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              padding: "12px 16px",
              color: "#fca5a5",
              fontSize: "13px",
              lineHeight: "1.5",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <Icon name="exclamation-triangle" size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ display: "block", marginBottom: "4px", color: "#ef4444" }}>
                {isAr ? "تحذير: صلاحيات متقدمة (خطورة عالية)" : "Warning: Elevated Permissions (High Risk)"}
              </strong>
              {isAr
                ? "يتطلب هذا الموصل تشغيل أوامر برمجية أو تكاملات واسعة للوصول إلى النظام. يرجى التأكد من الموثوقية التامة للعملية."
                : "This connector requires command execution or system integration that accesses local resources. Confirm you trust this source."}
            </div>
          </div>
        )}

        {isMediumRisk && !isHighRisk && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "6px",
              padding: "12px 16px",
              color: "#fde047",
              fontSize: "13px",
              lineHeight: "1.5",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <Icon name="exclamation-circle" size={18} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ display: "block", marginBottom: "4px", color: "#f59e0b" }}>
                {isAr ? "تنبيه: صلاحيات متوسطة" : "Note: Medium Risk Permissions"}
              </strong>
              {isAr
                ? "يطلب هذا العنصر الوصول إلى الملفات المحلية أو خدمات الويب الخارجية. سيتم حفظ أي مفاتيح تشفير بشكل آمن في الخزنة."
                : "This item requests local file or network api access. Credentials will be safely encrypted in the vault."}
            </div>
          </div>
        )}

        {/* Permissions Overview */}
        {item.permissions && item.permissions.length > 0 && (
          <div>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg-2)", display: "block", marginBottom: 6 }}>
              {isAr ? "صلاحيات الوصول المطلوبة:" : "Requested Permissions:"}
            </span>
            <PermissionPreview permissions={displayItem.permissions ?? item.permissions} isAr={isAr} />
          </div>
        )}

        {/* Form Inputs for MCP/Plugin Auth and Arguments */}
        {item.type === "mcp" && item.auth?.fields && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {item.auth.fields.map((field) => (
              <div key={field.name} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", color: "var(--fg-2)" }}>
                  {field.label}
                  {field.required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
                </label>
                <input
                  type={field.secret ? "password" : "text"}
                  required={field.required}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  placeholder={field.secret ? "••••••••••••••••" : (isAr ? "أدخل القيمة هنا..." : "Enter value...")}
                  style={{
                    background: "var(--bg-1)",
                    border: "1px solid var(--border-3)",
                    color: "var(--fg-1)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Skill Prompt Editor */}
        {item.type === "skill" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", color: "var(--fg-2)" }}>
              {isAr ? "تعليمات المهارة للوكيل:" : "Skill Instructions:"}
            </label>
            <textarea
              required
              rows={6}
              value={skillPromptText}
              onChange={(e) => setSkillPromptText(e.target.value)}
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--border-3)",
                color: "var(--fg-1)",
                padding: "10px",
                borderRadius: "6px",
                fontFamily: "monospace",
                fontSize: "13px",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>
        )}

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid var(--danger)",
              borderRadius: "6px",
              padding: "10px 12px",
              color: "var(--danger)",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button type="button" className="btn secondary sm" onClick={onClose} disabled={loading}>
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button type="submit" className="btn primary sm" disabled={loading}>
            {loading ? (isAr ? "جاري التثبيت..." : "Installing...") : (isAr ? "تأكيد وتثبيت" : "Confirm & Install")}
          </button>
        </div>
      </form>
    </div>
  );
}
