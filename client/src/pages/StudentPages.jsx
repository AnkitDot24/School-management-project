import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/client";
import { toast } from "../lib/toast.js";
import { can } from "../store/authSlice";
import StateBlock from "../components/StateBlock";
import { Icon, icons } from "../components/Icons";
import { InstituteIdBadge } from "../components/InstituteIdBadge.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";

export function StudentsPage() {
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", guardianName: "", email: "", classId: "", sectionId: "", academicYearId: "" });
  const [nextStuId, setNextStuId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);

  const visibleClasses = form.academicYearId
    ? classes.filter((c) => String(c.academicYearId?._id || c.academicYearId) === String(form.academicYearId))
    : classes;
  const visibleSections = sections.filter((s) => {
    const cid = s.classId?._id || s.classId;
    return form.classId ? String(cid) === String(form.classId) : true;
  });

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/students", { params: { q } });
      setRows(data.data);
    } catch (e) {
      toast.error(e.apiMessage);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    Promise.all([api.get("/classes"), api.get("/sections"), api.get("/academic-years")])
      .then(([c, s, y]) => {
        const classRows = c.data.data || [];
        const sectionRows = s.data.data || [];
        const yearRows = y.data.data || [];
        setClasses(classRows);
        setSections(sectionRows);
        setYears(yearRows);
        const current = yearRows.find((yr) => yr.isCurrent) || yearRows[0];
        if (current) {
          setForm((f) => ({ ...f, academicYearId: f.academicYearId || current._id }));
        }
        if (!classRows.length) {
          toast.info("No classes found. Add them under Academic Setup.");
        }
      })
      .catch((e) => toast.error(e.apiMessage || "Could not load classes and sections"));
  }, []);

  useEffect(() => {
    if (!showAddForm || !can(perms, "student.write")) return;
    api
      .get("/students/next-admission-no")
      .then(({ data }) => setNextStuId(data.data?.admissionNo || ""))
      .catch(() => setNextStuId(""));
  }, [showAddForm, perms]);

  return (
    <div className="card space-y-5">
      {/* Header with Search and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 !mb-0.5">Students Directory</h2>
          <p className="text-xs font-medium text-slate-400 !mb-0">
            Manage student enrollments, batches, and academic records ({rows.length} active)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Icon d={icons.search} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search name or STU-ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="w-52 sm:w-64 rounded-xl border border-slate-200/90 bg-slate-50/70 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <button className="btn secondary !py-2 !px-3.5 text-xs font-semibold" onClick={load} type="button">
            Search
          </button>

          {can(perms, "student.write") && (
            <button
              type="button"
              className="btn !py-2 !px-3.5 text-xs font-semibold"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Icon d={icons.plus} className="h-3.5 w-3.5" />
              <span>{showAddForm ? "Cancel" : "Add Student"}</span>
            </button>
          )}

          <Link to="/students/deleted" className="btn ghost !py-2 !px-3 text-xs font-medium text-slate-500">
            Archive
          </Link>
        </div>
      </div>

      {/* Expandable Add Student Form */}
      {can(perms, "student.write") && showAddForm && (
        <form
          className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5 mb-5 transition-all"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post("/students", form);
              toast.success("Student successfully enrolled.");
              setForm({ name: "", guardianName: "", email: "", classId: "", sectionId: "", academicYearId: form.academicYearId || "" });
              setShowAddForm(false);
              load();
            } catch (err) {
              toast.error(err.apiMessage);
            }
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 !mt-0 !mb-0">Enroll New Student</h3>
            <span className="text-xs text-slate-400">Fill details and save</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="field !mb-0 sm:col-span-2">
              <span>Student ID</span>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <InstituteIdBadge value={nextStuId || "STU-······"} kind="student" label={false} />
                <span className="text-[11px] text-slate-500">Unique per campus · assigned when you save</span>
              </div>
            </div>

            <div className="field !mb-0">
              <span>Full Name *</span>
              <input
                required
                placeholder="Student full name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="field !mb-0">
              <span>Email</span>
              <input
                type="email"
                placeholder="student@school.edu"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="field !mb-0">
              <span>Guardian Name</span>
              <input
                placeholder="Parent or guardian name"
                value={form.guardianName || ""}
                onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
              />
            </div>

            <div className="field !mb-0">
              <span>Class</span>
              <select
                value={form.classId || ""}
                onChange={(e) => setForm({ ...form, classId: e.target.value, sectionId: "" })}
              >
                <option value="">Select Class</option>
                {visibleClasses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field !mb-0">
              <span>Section</span>
              <select
                value={form.sectionId || ""}
                disabled={!form.classId}
                onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
              >
                <option value="">{form.classId ? "Select Section" : "Pick class first"}</option>
                {visibleSections.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
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
            <button className="btn !py-2 text-xs font-semibold">
              Save Student
            </button>
          </div>
        </form>
      )}

      {/* Table with Acadex styling */}
      <StateBlock loading={loading} empty={!rows.length} emptyText="No students found. Enroll the first student above.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Class / Section</th>
                <th>Email / Guardian</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>
                    <InstituteIdBadge value={r.admissionNo} kind="student" label={false} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {r.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900">{r.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-slate-600">
                      {r.classId?.name || "Unassigned"}
                    </span>
                  </td>
                  <td>
                    <p className="text-xs text-slate-700">{r.email || "—"}</p>
                    <p className="text-[11px] text-slate-400">{r.guardianName ? `Guardian: ${r.guardianName}` : ""}</p>
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/students/${r._id}`}
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

export function StudentProfile() {
  const { id } = useParams();
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const user = useSelector((s) => s.auth.user);
  const [doc, setDoc] = useState(null);
  const [form, setForm] = useState({});
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const visibleSections = sections.filter((s) => {
    const cid = s.classId?._id || s.classId;
    return form.classId ? String(cid) === String(form.classId) : true;
  });
  const visibleClasses = form.academicYearId
    ? classes.filter((c) => String(c.academicYearId?._id || c.academicYearId) === String(form.academicYearId))
    : classes;
  const [reason, setReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [parentUserId, setParentUserId] = useState("");

  async function load() {
    const { data } = await api.get(`/students/${id}`);
    setDoc(data.data);
    setForm({
      name: data.data.name,
      email: data.data.email || "",
      phone: data.data.phone || "",
      guardianName: data.data.guardianName || "",
      guardianPhone: data.data.guardianPhone || "",
      address: data.data.address || "",
      userId: data.data.userId?._id || data.data.userId || "",
      academicYearId: data.data.academicYearId?._id || data.data.academicYearId || "",
      classId: data.data.classId?._id || data.data.classId || "",
      sectionId: data.data.sectionId?._id || data.data.sectionId || "",
      isActive: data.data.isActive
    });
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e.apiMessage);
      toast.error(e.apiMessage);
    });
    api.get("/classes").then(({ data }) => setClasses(data.data || [])).catch(() => {});
    api.get("/sections").then(({ data }) => setSections(data.data || [])).catch(() => {});
    api.get("/academic-years").then(({ data }) => setYears(data.data || [])).catch(() => {});
  }, [id]);

  if (error && !doc) return <div className="empty">Could not load student.</div>;
  if (!doc) return <div className="empty">Loading…</div>;

  const canSoftDeleteStudent = can(perms, "student.softDelete", user) && !doc.isDeleted;
  const classSection = [doc.classId?.name, doc.sectionId?.name].filter(Boolean).join(" · ") || "Unassigned";

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-lg font-bold text-violet-800">
            {doc.name?.slice(0, 2).toUpperCase() || "?"}
          </div>
          <div>
            <h2 className="!mb-0.5 text-xl font-bold tracking-tight text-slate-900">{doc.name}</h2>
            <p className="text-sm font-medium text-slate-500">{classSection}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Guardian: {doc.guardianName || "—"}
              {doc.guardianPhone ? ` · ${doc.guardianPhone}` : ""}
            </p>
            <div className="mt-3">
              <InstituteIdBadge value={doc.admissionNo} kind="student" label="Student ID" size="md" />
            </div>
          </div>
        </div>
        <Link to="/students" className="btn ghost !py-2 !px-3 text-xs font-semibold text-slate-600">
          ← Students
        </Link>
      </div>
      {can(perms, "student.write") && (
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await api.put(`/students/${id}`, form);
              toast.success("Student updated");
              load();
            } catch (err) {
              toast.error(err.apiMessage);
            }
          }}
        >
          <div className="field sm:col-span-2">
            <span>Student ID</span>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <InstituteIdBadge value={doc.admissionNo} kind="student" label={false} size="md" />
              <span className="text-[11px] text-slate-500">Assigned at enrollment · cannot be changed</span>
            </div>
          </div>
          <div className="field">
            <span>Linked user id (portal login)</span>
            <input
              value={form.userId ?? ""}
              onChange={(ev) => setForm({ ...form, userId: ev.target.value })}
              placeholder="MongoDB User _id — requires STUDENT role membership"
            />
          </div>
          {["name", "email", "phone", "guardianName", "guardianPhone", "address"].map((k) => (
            <div className="field" key={k}>
              <span>{k}</span>
              <input value={form[k] ?? ""} onChange={(ev) => setForm({ ...form, [k]: ev.target.value })} />
            </div>
          ))}
          <div className="field">
            <span>Academic year</span>
            <select
              value={form.academicYearId}
              onChange={(ev) => setForm({ ...form, academicYearId: ev.target.value, classId: "", sectionId: "" })}
            >
              <option value="">None</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span>Class</span>
            <select
              value={form.classId}
              onChange={(ev) => setForm({ ...form, classId: ev.target.value, sectionId: "" })}
            >
              <option value="">None</option>
              {visibleClasses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span>Section</span>
            <select
              value={form.sectionId}
              onChange={(ev) => setForm({ ...form, sectionId: ev.target.value })}
              disabled={!form.classId}
            >
              <option value="">{form.classId ? "Select section" : "Pick class first"}</option>
              {visibleSections.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn">Save student</button>
          </div>
        </form>
      )}
      {can(perms, "student.write") && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.post("/parent-links", { parentUserId, studentId: id });
            toast.success("Parent linked");
          }}
        >
          <div className="field">
            <span>Link parent user id</span>
            <input value={parentUserId} onChange={(e) => setParentUserId(e.target.value)} />
          </div>
          <button className="btn secondary">Link parent</button>
        </form>
      )}
      {canSoftDeleteStudent && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            Soft-deleting hides this student from active lists. A reason is stored in the audit trail.
            {user?.isSuperAdmin && " (Platform Super Admin — confirm carefully.)"}
          </p>
          <button type="button" className="btn danger mt-2" onClick={() => setDeleteOpen(true)}>
            Soft delete student…
          </button>
        </div>
      )}
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => !deleteSubmitting && setDeleteOpen(false)}
        title={`Soft-delete student: ${doc.name}`}
        risk={user?.isSuperAdmin ? "high" : "standard"}
        typedConfirmMatch={user?.isSuperAdmin ? doc.name : ""}
        requireReason
        reason={reason}
        onReasonChange={setReason}
        reasonLabel="Delete reason (min. 5 characters)"
        confirmLabel="Soft-delete student"
        submitting={deleteSubmitting}
        onConfirm={async () => {
          setDeleteSubmitting(true);
          try {
            await api.post(`/students/${id}/soft-delete`, { reason: reason.trim() });
            toast.success("Student soft-deleted");
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
          You are about to soft-delete <strong>{doc.name}</strong>. They will no longer appear in normal student lists;
          restore is available from Deleted students if you have permission.
        </p>
      </DeleteConfirmModal>
    </div>
  );
}

export function DeletedStudents() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/students/deleted").then(({ data }) => setRows(data.data));
  }, []);
  return (
    <div className="card">
      <h2>Deleted students</h2>
      <StateBlock empty={!rows.length} emptyText="No deleted students">
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
                      await api.post(`/students/${r._id}/restore`);
                      const { data } = await api.get("/students/deleted");
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

export function AttendancePage() {
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [{ data: s }, { data: a }] = await Promise.all([
        api.get("/students"),
        api.get("/attendance", { params: filterStudent ? { studentId: filterStudent } : {} })
      ]);
      setStudents(s.data);
      setRows(a.data);
    } catch (e) {
      toast.error(e.apiMessage);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [filterStudent]);

  async function punch(kind) {
    try {
      await api.post(`/attendance/${kind}`, { studentId });
      toast.success(kind === "punch-in" ? "Punched in" : "Punched out");
      load();
    } catch (e) {
      toast.error(e.apiMessage);
    }
  }

  return (
    <div className="card">
      <h2>Student attendance</h2>
      {can(perms, "attendance.read") && (
        <div className="toolbar">
          <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
            <option value="">All students</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {can(perms, "attendance.punch") && (
        <div className="toolbar">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Student (staff punch)</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => punch("punch-in")} disabled={!studentId}>
            Punch in
          </button>
          <button className="btn secondary" onClick={() => punch("punch-out")} disabled={!studentId}>
            Punch out
          </button>
        </div>
      )}
      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
      <StateBlock empty={!rows.length}>
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Date</th>
              <th>In</th>
              <th>Out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.studentId?.name}</td>
                <td>{r.date}</td>
                <td>{r.punchInAt ? new Date(r.punchInAt).toLocaleTimeString() : "—"}</td>
                <td>{r.punchOutAt ? new Date(r.punchOutAt).toLocaleTimeString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </StateBlock>
      )}
    </div>
  );
}
