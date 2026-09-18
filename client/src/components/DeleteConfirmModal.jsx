import { useEffect, useState } from "react";

/**
 * Confirmation dialog for destructive / soft-delete actions.
 * @param {"standard"|"high"} risk — high requires typing `typedConfirmMatch` exactly
 */
export default function DeleteConfirmModal({
  open,
  onClose,
  title,
  children,
  confirmLabel = "Confirm delete",
  onConfirm,
  submitting = false,
  risk = "standard",
  typedConfirmMatch = "",
  typedConfirmHint = "",
  requireReason = false,
  reason = "",
  onReasonChange,
  reasonLabel = "Reason (required)",
  reasonMinLength = 5
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) return;
    setAcknowledged(false);
    setTyped("");
  }, [open]);

  if (!open) return null;

  const typedOk = risk !== "high" || typed.trim() === typedConfirmMatch;
  const reasonOk = !requireReason || (reason?.trim().length >= reasonMinLength);
  const canSubmit = acknowledged && typedOk && reasonOk && !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-red-100 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-red-50 bg-red-50/80 px-5 py-4">
          <h3 id="delete-confirm-title" className="!m-0 text-base font-bold text-red-900">
            {title}
          </h3>
        </div>
        <div className="space-y-4 p-5 text-sm text-slate-700">{children}</div>
        <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
          {requireReason && (
            <div className="field !mb-0">
              <span>{reasonLabel}</span>
              <textarea
                className="min-h-[72px]"
                required
                minLength={reasonMinLength}
                value={reason}
                onChange={(e) => onReasonChange?.(e.target.value)}
                placeholder="Explain why this record is being removed (audit trail)."
                disabled={submitting}
              />
            </div>
          )}
          {risk === "high" && (
            <div className="field !mb-0">
              <span>
                Type <strong className="font-mono text-red-800">{typedConfirmMatch}</strong> to confirm
              </span>
              <input
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={typedConfirmHint || typedConfirmMatch}
                disabled={submitting}
              />
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={submitting}
            />
            <span>
              I understand this action is destructive. Soft-deleted data may be hidden from daily use and requires
              restore workflows where available. This cannot be undone from the UI without an administrator restore.
            </span>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn secondary" disabled={submitting} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={!canSubmit}
              onClick={() => onConfirm?.()}
            >
              {submitting ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
