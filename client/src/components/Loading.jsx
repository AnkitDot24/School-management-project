export function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/80">
      <Spinner className="h-10 w-10" />
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

export function InlineLoader({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
      <Spinner className="h-6 w-6" />
      <span className="text-xs font-semibold text-slate-400">{label}</span>
    </div>
  );
}
