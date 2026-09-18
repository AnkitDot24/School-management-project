import { Icon, icons } from "./Icons";
import { Spinner } from "./Loading.jsx";

export default function StateBlock({
  loading,
  error,
  empty,
  emptyTitle,
  emptyText = "Nothing to show yet.",
  emptyAction,
  children
}) {
  if (loading) {
    return (
      <div className="empty flex flex-col items-center justify-center gap-3 py-14 text-slate-500">
        <Spinner className="h-7 w-7" />
        <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">Loading…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="banner error my-4">
        <span>{error}</span>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="empty flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-slate-400">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <Icon d={icons.clipboard} size={28} className="text-slate-300" />
        </div>
        {emptyTitle && <p className="text-sm font-bold text-slate-700">{emptyTitle}</p>}
        <p className="max-w-xs text-center text-sm font-medium text-slate-500">{emptyText}</p>
        {emptyAction}
      </div>
    );
  }
  return children;
}

