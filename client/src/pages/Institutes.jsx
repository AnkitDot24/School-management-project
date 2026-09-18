import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../api/client";
import StateBlock from "../components/StateBlock";
import { can } from "../store/authSlice";
import { RbacSectionNav } from "../components/RbacSectionNav.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import { toast } from "../lib/toast.js";

export function Institutes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", code: "", address: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const user = useSelector((s) => s.auth.user);

  async function load() {
    try {
      const { data } = await api.get("/institutes");
      setRows(data.data || []);
    } catch (e) {
      setError(e.apiMessage);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  if (!user?.isSuperAdmin) return <div className="banner error">Super Admin only</div>;

  return (
    <div className="card">
      <h2>Institutes</h2>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post("/institutes", form, { headers: { "Content-Type": "application/json" } });
          setForm({ name: "", code: "", address: "" });
          load();
        }}
      >
        <div className="field">
          <span>Name</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <span>Code</span>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div className="field">
          <span>Address</span>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="field">
          <span>&nbsp;</span>
          <button className="btn">Create</button>
        </div>
      </form>
      <StateBlock loading={loading} error={error} empty={!rows.length}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campus Name</th>
                <th>Code</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="font-bold text-slate-900">{r.name}</td>
                  <td>
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {r.code}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn danger !py-1.5 !px-3 !text-xs"
                      onClick={() => {
                        setDeleteReason("");
                        setDeleteTarget(r);
                      }}
                    >
                      Soft delete campus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => !deleteSubmitting && setDeleteTarget(null)}
        title={`Soft-delete institute: ${deleteTarget?.name || ""}`}
        risk="high"
        typedConfirmMatch={deleteTarget?.code || ""}
        typedConfirmHint="Campus code exactly as shown"
        requireReason
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        reasonLabel="Reason for removing this campus (audit log)"
        confirmLabel="Soft-delete institute"
        submitting={deleteSubmitting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteSubmitting(true);
          try {
            await api.post(`/institutes/${deleteTarget._id}/soft-delete`, { reason: deleteReason.trim() });
            toast.success(`Institute "${deleteTarget.name}" soft-deleted`);
            setDeleteTarget(null);
            setDeleteReason("");
            await load();
          } catch (e) {
            toast.error(e.apiMessage || "Could not delete institute");
          } finally {
            setDeleteSubmitting(false);
          }
        }}
      >
        <p className="!m-0 font-semibold text-red-800">Platform Super Admin — high-impact action</p>
        <p className="!m-0">
          You are about to soft-delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code}). Members may lose
          access to this campus in the UI; student and employee records remain in the database but the institute will
          be marked deleted and deactivated.
        </p>
        <p className="!m-0 text-slate-500">There is no self-service undo on this screen. Contact platform ops to restore if needed.</p>
      </DeleteConfirmModal>
    </div>
  );
}

export function InstituteSettings() {
  const inst = useSelector((s) => s.auth.institute);
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (inst) setForm({ name: inst.name, address: inst.address || "", phone: inst.phone || "", email: inst.email || "" });
  }, [inst]);
  if (!inst) return <div className="empty">Select an institute</div>;
  return (
    <div className="card">
      <RbacSectionNav />
      <h2>Institute settings</h2>
      {msg && <div className="banner ok">{msg}</div>}
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.patch(`/institutes/${inst._id}`, form);
          setMsg("Updated");
        }}
      >
        {Object.keys(form).map((k) => (
          <div className="field" key={k}>
            <span>{k}</span>
            <input disabled={!can(perms, "institute.update")} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </div>
        ))}
        {can(perms, "institute.update") && (
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn">Save</button>
          </div>
        )}
      </form>
    </div>
  );
}
