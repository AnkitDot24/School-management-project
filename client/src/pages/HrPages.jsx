import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/client";
import { toast } from "../lib/toast.js";
import { can } from "../store/authSlice";
import StateBlock from "../components/StateBlock";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import { Icon, icons } from "../components/Icons";
import { InstituteIdBadge } from "../components/InstituteIdBadge.jsx";

export function EmployeesPage() {
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nextEmpId, setNextEmpId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "teacher",
    designation: "",
    department: "",
    salary: ""
  });
  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/employees", { params: q ? { q } : {} });
      setRows(data.data || []);
    } catch (e) {
      toast.error(e.apiMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!showAddForm || !can(perms, "employee.write")) return;
    api
      .get("/employees/next-code")
      .then(({ data }) => setNextEmpId(data.data?.employeeCode || ""))
      .catch(() => setNextEmpId(""));
  }, [showAddForm, perms]);

  return (
    <div className="card space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 !mb-0.5">Faculty &amp; Staff Directory</h2>
          <p className="text-xs font-medium text-slate-400 !mb-0">
            Manage lecturers, teachers, administrative staff, and departments ({rows.length} records)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Icon d={icons.search} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search name or EMP-ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="w-48 sm:w-64 rounded-xl border border-slate-200/90 bg-slate-50/70 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <button type="button" className="btn secondary !py-2 !px-3.5 text-xs font-semibold" onClick={load}>
            Search
          </button>

          {can(perms, "employee.write") && (
            <button
              type="button"
              className="btn !py-2 !px-3.5 text-xs font-semibold"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Icon d={icons.plus} className="h-3.5 w-3.5" />
              <span>{showAddForm ? "Cancel" : "Add Faculty"}</span>
            </button>
          )}

          {can(perms, "employee.restore") && (
            <Link className="btn ghost !py-2 !px-3 text-xs font-medium text-slate-500" to="/employees/deleted">
              Archived
            </Link>
          )}
        </div>
      </div>

      {/* Expandable Add Form */}
      {can(perms, "employee.write") && showAddForm && (
        <form
          className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5 mb-5 transition-all"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post("/employees", form);
              setForm({ name: "", email: "", phone: "", type: "teacher", designation: "", department: "", salary: "" });
              toast.success("Faculty member registered.");
              setShowAddForm(false);
              load();
            } catch (err) {
              toast.error(err.apiMessage);
            }
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 !mt-0 !mb-0">Add Faculty / Staff Member</h3>
            <span className="text-xs text-slate-400">Fill information and save</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="field !mb-0 sm:col-span-2">
              <span>Employee ID</span>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <InstituteIdBadge value={nextEmpId || "EMP-······"} kind="employee" />
                <span className="text-[11px] text-slate-500">Unique per campus · assigned when you save</span>
              </div>
            </div>
            <div className="field !mb-0">
              <span>Full Name *</span>
              <input
                required
                placeholder="Dr. or Prof. Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field !mb-0">
              <span>Email</span>
              <input
                type="email"
                placeholder="staff@school.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field !mb-0">
              <span>Phone</span>
              <input
                placeholder="+1 555-0182"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field !mb-0">
              <span>Department</span>
              <input
                placeholder="e.g. Science / Math"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div className="field !mb-0">
              <span>Designation</span>
              <input
                placeholder="e.g. Senior Lecturer"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>
            <div className="field !mb-0">
              <span>Monthly Salary</span>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
              />
            </div>
            <div className="field !mb-0">
              <span>Staff Type</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="teacher">Teacher / Lecturer</option>
                <option value="staff">Support Staff</option>
                <option value="admin_staff">Administration</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-blue-100">
            <button
              type="button"
              className="btn ghost !py-2 text-xs"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn !py-2 text-xs font-semibold">
              Save Faculty Member
            </button>
          </div>
        </form>
      )}

      {/* Faculty Table */}
      <StateBlock loading={loading} empty={!rows.length} emptyText="No faculty or staff found. Add your first employee above.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name &amp; Designation</th>
                <th>Department</th>
                <th>Staff Type</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>
                    <InstituteIdBadge value={r.employeeCode} kind="employee" />
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {r.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{r.name}</p>
                        <p className="text-[11px] text-slate-400">{r.designation || "Lecturer"}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-slate-700">{r.department || "General"}</span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-slate-500 capitalize">{r.type?.replace("_", " ")}</span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/employees/${r._id}`}
                      className="btn ghost !py-1.5 !px-3 !text-xs font-semibold hover:border-blue-300 hover:text-blue-600"
                    >
                      View Profile →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
    </div>
  );
}


export function EmployeeProfile() {
  const { id } = useParams();
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const user = useSelector((s) => s.auth.user);
  const [doc, setDoc] = useState(null);
  const [form, setForm] = useState({});
  const [audit, setAudit] = useState([]);
  const [reason, setReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [{ data: e }, { data: a }] = await Promise.all([
      api.get(`/employees/${id}`),
      api.get("/audit-logs", { params: { entity: "Employee", entityId: id } })
    ]);
    setDoc(e.data);
    setForm({
      name: e.data.name,
      email: e.data.email,
      phone: e.data.phone,
      type: e.data.type,
      designation: e.data.designation,
      department: e.data.department || "",
      salary: e.data.salary ?? "",
      isActive: e.data.isActive,
      userId: e.data.userId?._id || e.data.userId || ""
    });
    setAudit(a.data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.apiMessage));
  }, [id]);

  if (error && !doc) return <div className="banner error">{error}</div>;
  if (!doc) return <div className="empty">Loading…</div>;

  const canSoftDeleteEmployee =
    (can(perms, "employee.softDelete", user) || can(perms, "employee.write", user)) && !doc.isDeleted;

  return (
    <div className="grid">
      <div className="card">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="!mb-0">{doc.name}</h2>
          <InstituteIdBadge value={doc.employeeCode} kind="employee" />
        </div>
        {msg && <div className="banner ok">{msg}</div>}
        <p className="text-sm text-slate-600">
          {doc.designation || "No designation"} · {doc.department || "No department"}
        </p>
        {can(perms, "employee.write") && (
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.put(`/employees/${id}`, { ...form, isActive: form.isActive === true || form.isActive === "true" });
                setMsg("Saved");
                load();
              } catch (err) {
                setError(err.apiMessage);
              }
            }}
          >
            {["name", "email", "phone", "designation", "department", "salary", "userId"].map((k) => (
              <div className="field" key={k}>
                <span>{k}</span>
                <input value={form[k] ?? ""} onChange={(ev) => setForm({ ...form, [k]: ev.target.value })} />
              </div>
            ))}
            <div className="field">
              <span>Type</span>
              <select value={form.type} onChange={(ev) => setForm({ ...form, type: ev.target.value })}>
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
                <option value="admin_staff">Admin staff</option>
              </select>
            </div>
            <div className="field">
              <span>Active</span>
              <select value={String(form.isActive)} onChange={(ev) => setForm({ ...form, isActive: ev.target.value === "true" })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="field">
              <span>&nbsp;</span>
              <button className="btn">Save changes</button>
            </div>
          </form>
        )}
        {canSoftDeleteEmployee && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              Soft-deleting hides this employee from active HR lists. Reason is recorded for audit.
              {user?.isSuperAdmin && " (Platform Super Admin — confirm carefully.)"}
            </p>
            <button type="button" className="btn danger mt-2" onClick={() => setDeleteOpen(true)}>
              Soft delete employee…
            </button>
          </div>
        )}
        <DeleteConfirmModal
          open={deleteOpen}
          onClose={() => !deleteSubmitting && setDeleteOpen(false)}
          title={`Soft-delete employee: ${doc.name}`}
          risk={user?.isSuperAdmin ? "high" : "standard"}
          typedConfirmMatch={user?.isSuperAdmin ? doc.name : ""}
          requireReason
          reason={reason}
          onReasonChange={setReason}
          reasonLabel="Delete reason (min. 5 characters)"
          confirmLabel="Soft-delete employee"
          submitting={deleteSubmitting}
          onConfirm={async () => {
            setDeleteSubmitting(true);
            try {
              await api.post(`/employees/${id}/soft-delete`, { reason: reason.trim() });
              toast.success("Employee soft-deleted");
              setDeleteOpen(false);
              setReason("");
              await load();
            } catch (e) {
              toast.error(e.apiMessage || "Soft delete failed");
            } finally {
              setDeleteSubmitting(false);
            }
          }}
        >
          <p className="!m-0">
            You are about to soft-delete <strong>{doc.name}</strong>. They will no longer appear in normal employee lists;
            restore is available from Deleted employees if you have permission.
          </p>
        </DeleteConfirmModal>
      </div>
      {can(perms, "audit.read") && (
        <div className="card">
          <h2>Audit trail</h2>
          <StateBlock empty={!audit.length}>
            <table>
              <tbody>
                {audit.map((r) => (
                  <tr key={r._id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.action}</td>
                    <td>{r.actorId?.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StateBlock>
        </div>
      )}
    </div>
  );
}

export function DeletedEmployees() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/employees/deleted").then(({ data }) => setRows(data.data));
  }, []);
  return (
    <div className="card">
      <h2>Deleted employees</h2>
      <StateBlock empty={!rows.length}>
        <table>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.name}</td>
                <td>{r.deleteReason}</td>
                <td>
                  <button
                    className="btn"
                    onClick={async () => {
                      await api.post(`/employees/${r._id}/restore`);
                      const { data } = await api.get("/employees/deleted");
                      setRows(data.data);
                    }}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StateBlock>
    </div>
  );
}

export function HrPage() {
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [att, setAtt] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ employeeId: "", fromDate: "", toDate: "", reason: "" });
  const [attForm, setAttForm] = useState({ employeeId: "", date: "", status: "present" });

  useEffect(() => {
    api.get("/employees").then(({ data }) => setEmployees(data.data || [])).catch(() => {});
    if (can(perms, "hr.leave")) api.get("/leaves").then(({ data }) => setLeaves(data.data || []));
    if (can(perms, "hr.staffAttendance")) api.get("/staff-attendance").then(({ data }) => setAtt(data.data || []));
  }, [perms]);

  return (
    <div className="grid">
      {can(perms, "hr.leave") && (
        <div className="card">
          <h2>Leave</h2>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post("/leaves", leaveForm);
              const { data } = await api.get("/leaves");
              setLeaves(data.data);
            }}
          >
            <EmpSelect employees={employees} value={leaveForm.employeeId} onChange={(v) => setLeaveForm({ ...leaveForm, employeeId: v })} />
            <div className="field">
              <span>From</span>
              <input type="date" required value={leaveForm.fromDate} onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })} />
            </div>
            <div className="field">
              <span>To</span>
              <input type="date" required value={leaveForm.toDate} onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })} />
            </div>
            <div className="field">
              <span>Reason</span>
              <input required value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            </div>
            <div className="field">
              <span>&nbsp;</span>
              <button className="btn">Submit leave</button>
            </div>
          </form>
          <StateBlock empty={!leaves.length}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Dates</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td>{l.employeeId?.name}</td>
                    <td>
                      {l.fromDate?.slice(0, 10)} – {l.toDate?.slice(0, 10)}
                    </td>
                    <td>
                      {l.status}{" "}
                      {l.status === "pending" && (
                        <button
                          className="btn secondary"
                          onClick={async () => {
                            await api.patch(`/leaves/${l._id}`, { status: "approved" });
                            const { data } = await api.get("/leaves");
                            setLeaves(data.data);
                          }}
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StateBlock>
        </div>
      )}
      {can(perms, "hr.staffAttendance") && (
        <div className="card">
          <h2>Staff attendance</h2>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post("/staff-attendance", attForm);
              const { data } = await api.get("/staff-attendance");
              setAtt(data.data);
            }}
          >
            <EmpSelect employees={employees} value={attForm.employeeId} onChange={(v) => setAttForm({ ...attForm, employeeId: v })} />
            <div className="field">
              <span>Date</span>
              <input required type="date" value={attForm.date} onChange={(e) => setAttForm({ ...attForm, date: e.target.value })} />
            </div>
            <div className="field">
              <span>Status</span>
              <select value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}>
                <option>present</option>
                <option>absent</option>
                <option>leave</option>
              </select>
            </div>
            <div className="field">
              <span>&nbsp;</span>
              <button className="btn">Save</button>
            </div>
          </form>
          <StateBlock empty={!att.length}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {att.map((a) => (
                  <tr key={a._id}>
                    <td>{a.employeeId?.name}</td>
                    <td>{a.date}</td>
                    <td>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StateBlock>
        </div>
      )}
    </div>
  );
}

function EmpSelect({ employees, value, onChange }) {
  return (
    <div className="field">
      <span>Employee</span>
      <select required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {employees.map((e) => (
          <option key={e._id} value={e._id}>
            {e.name} ({e.type})
          </option>
        ))}
      </select>
    </div>
  );
}
