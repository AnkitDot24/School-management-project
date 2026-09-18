import { useDispatch, useSelector } from "react-redux";
import { removeToast } from "../store/uiSlice.js";
import { Icon, icons } from "./Icons.jsx";

const styles = {
  success: "border-emerald-200/80 bg-emerald-950 text-emerald-50 shadow-emerald-900/20",
  error: "border-rose-200/80 bg-rose-950 text-rose-50 shadow-rose-900/25",
  info: "border-blue-200/80 bg-slate-900 text-slate-50 shadow-slate-900/30"
};

const iconColor = {
  success: "text-emerald-400",
  error: "text-rose-400",
  info: "text-blue-400"
};

export function AppToaster() {
  const dispatch = useDispatch();
  const toasts = useSelector((s) => s.ui.toasts);

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed right-3 top-[4.5rem] z-[100] flex w-[min(100%,22rem)] flex-col gap-2 sm:right-5 sm:top-5"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`toast-enter pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${styles[t.type] || styles.info}`}
        >
          <Icon
            d={t.type === "error" ? icons.plus : icons.check}
            size={18}
            className={`mt-0.5 shrink-0 ${iconColor[t.type] || iconColor.info} ${t.type === "error" ? "rotate-45" : ""}`}
          />
          <p className="flex-1 text-[13px] font-semibold leading-snug">{t.text}</p>
          <button
            type="button"
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
            onClick={() => dispatch(removeToast(t.id))}
          >
            <Icon d={icons.plus} size={14} className="rotate-45" />
          </button>
        </div>
      ))}
    </div>
  );
}
