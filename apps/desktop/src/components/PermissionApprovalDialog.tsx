import type { PermissionRequest } from "@aura-os/shared";
import { Icon } from "@aura-os/ui";

interface PermissionApprovalDialogProps {
  permission: PermissionRequest | null;
  onDecide: (decision: string) => void;
  labels?: {
    highRisk: string;
    needsApproval: string;
    desktopOnly: string;
    allowOnce: string;
    allowAlways: string;
    deny: string;
  };
}

const DEFAULT_LABELS = {
  highRisk: "High risk",
  needsApproval: "Needs approval",
  desktopOnly: "Desktop approval required. Remote clients cannot approve this action.",
  allowOnce: "Allow once",
  allowAlways: "Allow always (this project)",
  deny: "Deny",
};

export function PermissionApprovalDialog({ permission, onDecide, labels: labelOverrides }: PermissionApprovalDialogProps) {
  if (!permission) return null;
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const icon =
    permission.category === "file"
      ? "file"
      : permission.category === "shell"
        ? "terminal"
        : permission.category === "browser"
          ? "globe"
          : permission.category === "computer-use"
            ? "monitor"
            : permission.category === "plugin"
              ? "puzzle"
              : permission.category === "mcp"
                ? "cpu"
                : permission.category === "bridge"
                  ? "plug"
                  : "shield-check";
  const high = permission.risk === "high" || permission.risk === "critical";
  const desktopOnly = permission.desktopOnly || permission.category === "computer-use";

  return (
    <div className="task-inline-approval">
      <div className={`approval fade${high ? " risk-high" : ""}`}>
        <div className="at">
          <div className="aic">
            <Icon name={icon} size={18} />
          </div>
          <div>
            <div className="ah">
              {permission.action} — {permission.target}
              <span className="risk">{high ? labels.highRisk : labels.needsApproval}</span>
            </div>
            <div className="adesc">{permission.reason}</div>
            {desktopOnly && (
              <div className="adesc" style={{ marginTop: 6 }}>
                {labels.desktopOnly}
              </div>
            )}
          </div>
        </div>
        <div className="acts">
          <button type="button" className="btn primary sm" onClick={() => onDecide("allow-once")}>
            {labels.allowOnce}
          </button>
          {permission.allowAlwaysAvailable && (
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => onDecide("allow-always-project")}
            >
              {labels.allowAlways}
            </button>
          )}
          <div className="cspacer" />
          <button type="button" className="btn danger sm" onClick={() => onDecide("deny")}>
            {labels.deny}
          </button>
        </div>
      </div>
    </div>
  );
}
