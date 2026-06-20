import { Icon } from "@aura-os/ui";

interface PermissionPreviewProps {
  permissions: string[];
  isAr?: boolean;
}

export default function PermissionPreview({ permissions, isAr }: PermissionPreviewProps) {
  if (!permissions || permissions.length === 0) {
    return (
      <div style={{ color: "var(--fg-3)", fontSize: "13px", fontStyle: "italic" }}>
        {isAr ? "لا توجد صلاحيات مطلوبة" : "No permissions required"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {permissions.map((perm, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "13px",
            color: "var(--fg-2)",
            background: "var(--bg-3)",
            padding: "6px 10px",
            borderRadius: "var(--r-xs, 4px)",
            border: "1px solid var(--border-3)",
          }}
        >
          <Icon name="shield" size={13} style={{ color: "var(--accent)" }} />
          <span>{perm}</span>
        </div>
      ))}
    </div>
  );
}
