import type { PermissionRequest } from "@aura-os/shared";
import { Icon } from "@aura-os/ui";

interface PermissionApprovalDialogProps {
  permission: PermissionRequest | null;
  onDecide: (decision: string) => void;
}

export function PermissionApprovalDialog({ permission, onDecide }: PermissionApprovalDialogProps) {
  if (!permission) return null;
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
              <span className="risk">{high ? "High risk" : "Needs approval"}</span>
            </div>
            <div className="adesc">{permission.reason}</div>
            {desktopOnly && (
              <div className="adesc" style={{ marginTop: 6 }}>
                Desktop approval required — remote clients cannot approve this action.
              </div>
            )}
          </div>
        </div>
        <div className="acts">
          <button type="button" className="btn primary sm" onClick={() => onDecide("allow-once")}>
            Allow once
          </button>
          {permission.allowAlwaysAvailable && (
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => onDecide("allow-always-project")}
            >
              Allow always (this project)
            </button>
          )}
          <div className="cspacer" />
          <button type="button" className="btn danger sm" onClick={() => onDecide("deny")}>
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}
