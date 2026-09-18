import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "../lib/toast.js";
import StateBlock from "./StateBlock";
import { Icon, icons } from "./Icons";

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function filterRows(rows, q, searchKeys) {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    searchKeys.some((key) => {
      const val = row[key];
      const text =
        val == null ? ""
        : typeof val === "object" ? val.name || val.code || ""
        : String(val);
      return text.toLowerCase().includes(needle);
    })
  );
}

export default function SetupPanel({
  title,
  description,
  recordLabel,
  rows = [],
  columns,
  fields,
  canWrite,
  onSubmit,
  searchKeys = ["name"],
  busy = false
}) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const [sort, setSort] = useState("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [form, setForm] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const filterRef = useRef(null);

  const singular = recordLabel || title.replace(/s$/, "") || "record";

  const filtered = useMemo(() => {
    let list = filterRows(rows, debouncedQ, searchKeys);
    if (sort === "name") {
      list = [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    } else if (sort === "oldest") {
      list = [...list].reverse();
    }
    return list;
  }, [rows, debouncedQ, searchKeys, sort]);

  useEffect(() => {
    if (!filterOpen) return;
    function onDoc(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e) {
      if (e.key === "Escape" && !submitting) setModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, submitting]);

  function openModal() {
    setForm({});
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      toast.success(`${singular} saved.`);
      setForm({});
      setModalOpen(false);
    } catch (err) {
      toast.error(err.apiMessage || err.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  const resultSummary =
    debouncedQ.trim() ?
      `${filtered.length} match${filtered.length === 1 ? "" : "es"}`
    : `${rows.length} total`;

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="min-w-0">
          <h2 className="!mb-0.5 text-lg font-bold tracking-tight text-slate-900">{title}</h2>
          {description && <p className="!mb-0 text-xs text-slate-500">{description}</p>}
          <p className="!mb-0 mt-1 text-[11px] font-medium text-slate-400">{resultSummary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon d={icons.search} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder={`Search ${title.toLowerCase()}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-40 rounded-xl border border-slate-200/90 bg-slate-50/70 py-2 pl-9 pr-7 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-48"
            />
            {q && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setQ("")}>
                ×
              </button>
            )}
          </div>
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              className="btn secondary !flex !items-center !gap-1.5 !py-2 !px-3 text-xs font-semibold"
              onClick={() => setFilterOpen((o) => !o)}
            >
              <Icon d={icons.filter} className="h-3.5 w-3.5" />
              Sort
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
                {[
                  ["newest", "Default order"],
                  ["name", "Name A → Z"],
                  ["oldest", "Reverse order"]
                ].map(([val, lab]) => (
                  <label key={val} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                    <input type="radio" name={`sort-${title}`} checked={sort === val} onChange={() => setSort(val)} />
                    {lab}
                  </label>
                ))}
              </div>
            )}
          </div>
          {canWrite && fields?.length > 0 && (
            <button type="button" className="btn !flex !items-center !gap-1.5 !py-2 !px-3 text-xs font-semibold" onClick={openModal}>
              <Icon d={icons.plus} className="h-3.5 w-3.5" />
              Add {singular}
            </button>
          )}
        </div>
      </div>

      <StateBlock
        loading={busy}
        empty={!busy && !filtered.length}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyText={canWrite ? `Add your first ${singular.toLowerCase()}.` : "Nothing to show."}
        emptyAction={
          canWrite && fields?.length > 0 ?
            <button type="button" className="btn mt-3 !py-2 text-xs" onClick={openModal}>
              Add {singular}
            </button>
          : null
        }
      >
        <div className="table-scroll rounded-xl border border-slate-100">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key || c.label}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._id}>
                  {columns.map((c) => (
                    <td key={c.key || c.label}>{c.render ? c.render(row) : row[c.key] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>

      {modalOpen && canWrite && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="!m-0 text-base font-bold text-slate-900">New {singular}</h3>
              <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>
            <form className="space-y-4 p-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((f) => (
                  <div className={`field !mb-0 ${f.fullWidth ? "sm:col-span-2" : ""}`} key={f.name}>
                    <span>
                      {f.label}
                      {f.required !== false && <span className="text-rose-500"> *</span>}
                    </span>
                    {f.type === "select" ?
                      <select
                        required={f.required !== false}
                        value={form[f.name] || ""}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      >
                        <option value="">Select {f.label.toLowerCase()}</option>
                        {(f.options || []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    : <input
                        required={f.required !== false}
                        type={f.type || "text"}
                        value={form[f.name] || ""}
                        placeholder={f.placeholder}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      />
                    }
                    {f.hint && <p className="!mb-0 mt-1 text-[11px] text-slate-400">{f.hint}</p>}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" className="btn ghost !py-2 text-xs" disabled={submitting} onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn !py-2 text-xs font-semibold" disabled={submitting}>
                  {submitting ? "Saving…" : `Save ${singular}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
