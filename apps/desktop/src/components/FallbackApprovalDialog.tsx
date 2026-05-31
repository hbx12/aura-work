interface FallbackApprovalDialogProps {
  open: boolean;
  fromProvider?: string | null;
  toProvider: string;
  modelId: string;
  reason: string;
  onApprove: () => void;
  onDeny: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export function FallbackApprovalDialog({
  open,
  fromProvider,
  toProvider,
  modelId,
  reason,
  onApprove,
  onDeny,
  t,
}: FallbackApprovalDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{t("chat.fallback.title")}</h2>
        <p className="modal-desc">{reason}</p>
        <p className="modal-desc">
          {fromProvider ?? "—"} → {toProvider}/{modelId}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onDeny}>
            {t("chat.fallback.deny")}
          </button>
          <button type="button" className="btn primary" onClick={onApprove}>
            {t("chat.fallback.approve")}
          </button>
        </div>
      </div>
    </div>
  );
}
