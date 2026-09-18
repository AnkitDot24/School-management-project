/** Display institute-scoped public IDs (EMP-/STU-/ADM-/TCH-/PAR-/MEM-/…) and legacy admission codes. */
export function formatInstituteId(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  const upper = trimmed.toUpperCase();
  const m = upper.match(/^([A-Z]{3})-(\d+)$/);
  if (m) return `${m[1]}-${m[2].padStart(6, "0")}`;
  return trimmed;
}

function toneForId(formatted, kind) {
  const upper = String(formatted).toUpperCase();
  if (kind === "student" || upper.startsWith("STU-")) {
    return "bg-violet-50 text-violet-800 ring-violet-100";
  }
  if (kind === "employee" || upper.startsWith("EMP-")) {
    return "bg-blue-50 text-blue-800 ring-blue-100";
  }
  if (upper.startsWith("PAR-")) return "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-100";
  if (upper.startsWith("TCH-")) return "bg-teal-50 text-teal-800 ring-teal-100";
  if (upper.startsWith("ADM-") || upper.startsWith("PRN-")) {
    return "bg-amber-50 text-amber-900 ring-amber-100";
  }
  if (upper.startsWith("HST-")) return "bg-orange-50 text-orange-900 ring-orange-100";
  if (upper.startsWith("TRN-")) return "bg-sky-50 text-sky-900 ring-sky-100";
  if (upper.startsWith("HRM-")) return "bg-rose-50 text-rose-900 ring-rose-100";
  if (upper.startsWith("ACC-") || upper.startsWith("CFO-")) return "bg-emerald-50 text-emerald-900 ring-emerald-100";
  if (upper.startsWith("LIB-")) return "bg-lime-50 text-lime-900 ring-lime-100";
  if (upper.startsWith("MEM-")) return "bg-slate-100 text-slate-700 ring-slate-200";
  if (kind === "student") return "bg-violet-50 text-violet-800 ring-violet-100";
  if (kind === "employee") return "bg-blue-50 text-blue-800 ring-blue-100";
  return "bg-indigo-50 text-indigo-800 ring-indigo-100";
}

const SIZE_CLASS = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs"
};

export function InstituteIdBadge({ value, kind = "default", label, size = "sm" }) {
  const formatted = formatInstituteId(value);
  if (!formatted) return <span className="text-slate-400">—</span>;

  const tone = toneForId(formatted, kind);
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.sm;
  const resolvedLabel = label === false || label == null ? null : String(label);

  const badge = (
    <span
      className={`inline-flex items-center rounded-md font-mono font-bold tracking-wide ring-1 ring-inset ${sizeClass} ${tone}`}
      title={resolvedLabel || "Institute ID"}
    >
      {formatted}
    </span>
  );

  if (!resolvedLabel) return badge;

  return (
    <div className="inline-flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{resolvedLabel}</span>
      {badge}
    </div>
  );
}
