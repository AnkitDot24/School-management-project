import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";
import { toast } from "../lib/toast.js";
import StateBlock from "./StateBlock";
import { Icon, icons } from "./Icons";

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A → Z)" }
];

export default function CrudPage({
  title,
  description,
  path,
  columns,
  fields,
  canWrite,
  extra,
  transformPayload,
  recordLabel
}) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const [sort, setSort] = useState("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filterRef = useRef(null);

  const singular = recordLabel || title.replace(/s$/, "") || "record";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(path, {
        params: {
          q: debouncedQ.trim() || undefined,
          sort: sort === "newest" ? undefined : sort
        }
      });
      setRows(data.data || []);
    } catch (e) {
      setError(e.apiMessage);
      toast.error(e.apiMessage);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [path, debouncedQ, sort]);

  useEffect(() => {
    load();
  }, [load]);

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
      if (e.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  function openModal() {
    setForm({});
    setError("");
    setModalOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = transformPayload ? transformPayload(form) : form;
      await api.post(path, payload);
      setForm({});
      toast.success(`${singular} saved successfully.`);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.apiMessage);
      toast.error(err.apiMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const activeFilters = sort !== "newest" || debouncedQ.trim();
  const resultSummary =
    debouncedQ.trim() ?
      `${rows.length} result${rows.length === 1 ? "" : "s"} for “${debouncedQ.trim()}”`
    : `${rows.length} total`;

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="min-w-0">
          <h2 className="!mb-0.5 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="!mb-0 text-xs font-medium text-slate-400">
            {description || "Search, sort, and manage records"} · {resultSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon d={icons.search} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder={`Search ${title.toLowerCase()}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-44 rounded-xl border border-slate-200/90 bg-slate-50/70 py-2 pl-9 pr-8 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-56"
            />
            {q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon d={icons.plus} className="h-3 w-3 rotate-45" />
              </button>
            )}
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              className={`btn secondary !flex !items-center !gap-1.5 !py-2 !px-3.5 text-xs font-semibold ${
                activeFilters ? "!border-violet-200 !bg-violet-50 !text-violet-800" : ""
              }`}
              onClick={() => setFilterOpen((o) => !o)}
            >
              <Icon d={icons.filter} className="h-3.5 w-3.5" />
              Sort &amp; filter
              {activeFilters && (
                <span className="ml-0.5 rounded-full bg-violet-600 px-1.5 py-px text-[10px] font-bold text-white">
                  •
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl ring-1 ring-slate-900/5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Sort by</p>
                {SORT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      name={`sort-${path}`}
                      checked={sort === opt.value}
                      onChange={() => setSort(opt.value)}
                      className="text-blue-600"
                    />
                    {opt.label}
                  </label>
                ))}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    className="w-full rounded-lg py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setSort("newest");
                      setQ("");
                      setFilterOpen(false);
                    }}
                  >
                    Reset all
                  </button>
                </div>
              </div>
            )}
          </div>

          {canWrite && fields?.length > 0 && (
            <button type="button" className="btn !flex !items-center !gap-1.5 !py-2 !px-3.5 text-xs font-semibold" onClick={openModal}>
              <Icon d={icons.plus} className="h-3.5 w-3.5" />
              Add {singular}
            </button>
          )}
        </div>
      </div>

      <StateBlock
        loading={loading}
        error={loading ? "" : error}
        empty={!loading && !rows.length}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyText={
          canWrite ?
            `Add your first ${singular.toLowerCase()} to get started.`
          : `There are no ${title.toLowerCase()} to display.`
        }
        emptyAction={
          canWrite && fields?.length > 0 ?
            <button type="button" className="btn mt-3 !py-2 text-xs" onClick={openModal}>
              <Icon d={icons.plus} className="h-3.5 w-3.5" />
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
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>

      {extra}

      {modalOpen && canWrite && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crud-modal-title"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-100 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h3 id="crud-modal-title" className="!m-0 text-base font-bold text-slate-900">
                  New {singular}
                </h3>
                <p className="!m-0 text-xs text-slate-400">All required fields must be filled.</p>
              </div>
              <button
                type="button"
                disabled={submitting}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <Icon d={icons.plus} className="h-4 w-4 rotate-45" />
              </button>
            </div>

            <form className="space-y-4 p-5" onSubmit={submit}>
              {error && <div className="banner error !my-0">{error}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((f) => (
                  <div className={`field !mb-0 ${f.fullWidth ? "sm:col-span-2" : ""}`} key={f.name}>
                    <span>
                      {f.label}
                      {f.required && <span className="text-rose-500"> *</span>}
                    </span>
                    {f.type === "select" ?
                      <select
                        required={f.required}
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
                    : f.type === "textarea" ?
                      <textarea
                        rows={3}
                        required={f.required}
                        value={form[f.name] || ""}
                        placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      />
                    : <input
                        required={f.required}
                        type={f.type || "text"}
                        min={f.type === "number" ? f.min ?? 0 : undefined}
                        value={form[f.name] || ""}
                        placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      />
                    }
                    {f.hint && <p className="!mb-0 mt-1 text-[11px] text-slate-400">{f.hint}</p>}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
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
