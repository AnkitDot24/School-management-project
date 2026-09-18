import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/client";
import { toast } from "../lib/toast.js";
import { can } from "../store/authSlice";
import StateBlock from "../components/StateBlock";
import CrudPage from "../components/CrudPage";
import { RbacSectionNav } from "../components/RbacSectionNav.jsx";
import { InstituteIdBadge } from "../components/InstituteIdBadge.jsx";

export function ExamsPage() {
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const [years, setYears] = useState([]);
  const [exams, setExams] = useState([]);
  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [examForm, setExamForm] = useState({ name: "", academicYearId: "" });
  const [markForm, setMarkForm] = useState({ examId: "", studentId: "", subjectId: "", marks: "", maxMarks: 100 });

  async function load() {
    const [y, e, m, s, sub] = await Promise.all([
      api.get("/academic-years"),
      api.get("/exams"),
      api.get("/exam-marks"),
      api.get("/students"),
      api.get("/subjects")
    ]);
    setYears(y.data.data);
    setExams(e.data.data);
    setMarks(m.data.data);
    setStudents(s.data.data);
    setSubjects(sub.data.data);
  }
  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <div className="card">
      <h2>Exams & results</h2>
      {can(perms, "exam.write") && (
        <>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post("/exams", examForm);
              load();
            }}
          >
            <div className="field">
              <span>Name</span>
              <input required value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} />
            </div>
            <div className="field">
              <span>Year</span>
              <select required value={examForm.academicYearId} onChange={(e) => setExamForm({ ...examForm, academicYearId: e.target.value })}>
                <option value="">Select</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>&nbsp;</span>
              <button className="btn">Create exam</button>
            </div>
          </form>
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post("/exam-marks", markForm);
              load();
            }}
          >
            {[
              ["examId", exams, "name"],
              ["studentId", students, "name"],
              ["subjectId", subjects, "name"]
            ].map(([k, list, lab]) => (
              <div className="field" key={k}>
                <span>{k}</span>
                <select required value={markForm[k]} onChange={(e) => setMarkForm({ ...markForm, [k]: e.target.value })}>
                  <option value="">Select</option>
                  {list.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i[lab]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="field">
              <span>Marks</span>
              <input required type="number" value={markForm.marks} onChange={(e) => setMarkForm({ ...markForm, marks: e.target.value })} />
            </div>
            <div className="field">
              <span>&nbsp;</span>
              <button className="btn">Save mark</button>
            </div>
          </form>
        </>
      )}
      <StateBlock empty={!marks.length} emptyText="No exam marks entered yet.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m) => (
                <tr key={m._id}>
                  <td className="font-bold text-slate-900">{m.studentId?.name}</td>
                  <td>{m.examId?.name}</td>
                  <td>{m.subjectId?.name}</td>
                  <td>
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                      {m.marks} / {m.maxMarks}
                    </span>
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

export function LibraryPage() {
  const { effectivePermissions: perms, user } = useSelector((s) => s.auth);
  return (
    <div className="space-y-6">
      <CrudPage
        title="Books"
        recordLabel="Book"
        path="/library/items"
        canWrite={can(perms, "library.write") || user?.isSuperAdmin}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "author", label: "Author" },
          { name: "copies", label: "Copies", type: "number" }
        ]}
        columns={[
          { key: "title", label: "Title" },
          { key: "author", label: "Author" },
          { key: "copies", label: "Copies" }
        ]}
      />
      <Circulation />
    </div>
  );
}

function Circulation() {
  const [rows, setRows] = useState([]);
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ libraryItemId: "", studentId: "", dueAt: "" });
  useEffect(() => {
    api.get("/library/circulation").then(({ data }) => setRows(data.data));
    api.get("/library/items").then(({ data }) => setBooks(data.data));
    api.get("/students").then(({ data }) => setStudents(data.data)).catch(() => {});
  }, []);
  return (
    <div className="card">
      <h2>Circulation</h2>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post("/library/issue", form);
          const { data } = await api.get("/library/circulation");
          setRows(data.data);
        }}
      >
        <div className="field">
          <span>Book</span>
          <select required value={form.libraryItemId} onChange={(e) => setForm({ ...form, libraryItemId: e.target.value })}>
            <option value="">Select</option>
            {books.map((b) => (
              <option key={b._id} value={b._id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Student</span>
          <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
            <option value="">Select</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Due</span>
          <input required type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
        </div>
        <div className="field">
          <span>&nbsp;</span>
          <button className="btn">Issue</button>
        </div>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Issued To Student</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td className="font-bold text-slate-900">{r.libraryItemId?.title}</td>
                <td>{r.studentId?.name}</td>
                <td>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    r.returnedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {r.returnedAt ? "Returned" : "Checked Out"}
                  </span>
                </td>
                <td className="text-right">
                  {!r.returnedAt && (
                    <button className="btn secondary !py-1 !px-2.5 text-xs font-semibold" onClick={async () => { await api.post(`/library/circulation/${r._id}/return`); const { data } = await api.get("/library/circulation"); setRows(data.data); }}>
                      Return Book
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HostelPage() {
  const { effectivePermissions: perms, user } = useSelector((s) => s.auth);
  return (
    <div className="space-y-6">
      <CrudPage
        title="Blocks"
        recordLabel="Block"
        path="/hostel/blocks"
        canWrite={can(perms, "hostel.write") || user?.isSuperAdmin}
        fields={[{ name: "name", label: "Block name", required: true }]}
        columns={[{ key: "name", label: "Name" }]}
      />
      <RoomsAlloc />
    </div>
  );
}

function RoomsAlloc() {
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [alloc, setAlloc] = useState([]);
  const [students, setStudents] = useState([]);
  const [roomForm, setRoomForm] = useState({ blockId: "", name: "", capacity: 2 });
  const [aForm, setAForm] = useState({ roomId: "", studentId: "" });
  async function load() {
    const [b, r, a, s] = await Promise.all([api.get("/hostel/blocks"), api.get("/hostel/rooms"), api.get("/hostel/allocations"), api.get("/students")]);
    setBlocks(b.data.data);
    setRooms(r.data.data);
    setAlloc(a.data.data);
    setStudents(s.data.data);
  }
  useEffect(() => {
    load().catch(() => {});
  }, []);
  return (
    <div className="card">
      <h2>Rooms & allocations</h2>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post("/hostel/rooms", roomForm);
          load();
        }}
      >
        <div className="field">
          <span>Block</span>
          <select required value={roomForm.blockId} onChange={(e) => setRoomForm({ ...roomForm, blockId: e.target.value })}>
            <option value="">Select</option>
            {blocks.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Room</span>
          <input required value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} />
        </div>
        <button className="btn">Add room</button>
      </form>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post("/hostel/allocations", aForm);
          load();
        }}
      >
        <div className="field">
          <span>Room</span>
          <select required value={aForm.roomId} onChange={(e) => setAForm({ ...aForm, roomId: e.target.value })}>
            <option value="">Select</option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Student</span>
          <select required value={aForm.studentId} onChange={(e) => setAForm({ ...aForm, studentId: e.target.value })}>
            <option value="">Select</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn">Allocate</button>
      </form>
      <table>
        <tbody>
          {alloc.map((a) => (
            <tr key={a._id}>
              <td>{a.studentId?.name}</td>
              <td>{a.roomId?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TransportPage() {
  const { effectivePermissions: perms, user } = useSelector((s) => s.auth);
  const w = can(perms, "transport.write") || user?.isSuperAdmin;

  const parseStops = (form) => ({
    name: form.name,
    stops: form.stops ?
      String(form.stops)
        .split(/[,;|\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="!mb-1 text-2xl font-bold tracking-tight text-slate-900">Transport</h1>
        <p className="!mb-0 text-sm text-slate-500">Manage fleet, drivers, routes, and student assignments.</p>
      </div>
      <CrudPage
        title="Vehicles"
        recordLabel="Vehicle"
        path="/transport/vehicles"
        canWrite={w}
        fields={[
          { name: "number", label: "Registration number", required: true, placeholder: "e.g. DL-01-AB-1234" },
          { name: "capacity", label: "Seating capacity", type: "number", min: 1, placeholder: "40" }
        ]}
        columns={[
          { key: "number", label: "Number" },
          {
            key: "capacity",
            label: "Capacity",
            render: (r) => (r.capacity != null ? `${r.capacity} seats` : "—")
          }
        ]}
      />
      <CrudPage
        title="Drivers"
        recordLabel="Driver"
        path="/transport/drivers"
        canWrite={w}
        fields={[
          { name: "name", label: "Full name", required: true },
          { name: "phone", label: "Phone", placeholder: "+91 …" },
          { name: "licenseNo", label: "License no.", placeholder: "Optional" }
        ]}
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "licenseNo", label: "License" }
        ]}
      />
      <CrudPage
        title="Routes"
        recordLabel="Route"
        path="/transport/routes"
        canWrite={w}
        transformPayload={parseStops}
        fields={[
          { name: "name", label: "Route name", required: true, placeholder: "e.g. Sector 62 – School" },
          {
            name: "stops",
            label: "Stops",
            type: "textarea",
            fullWidth: true,
            hint: "Separate stops with commas or new lines.",
            placeholder: "Stop A, Stop B, Main gate"
          }
        ]}
        columns={[
          { key: "name", label: "Route" },
          {
            key: "stops",
            label: "Stops",
            render: (r) => (Array.isArray(r.stops) && r.stops.length ? r.stops.join(" → ") : "—")
          }
        ]}
      />
      <TAssign />
    </div>
  );
}

function TAssign() {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState({ studentId: "", routeId: "" });
  useEffect(() => {
    api.get("/transport/assignments").then(({ data }) => setRows(data.data));
    api.get("/students").then(({ data }) => setStudents(data.data)).catch(() => {});
    api.get("/transport/routes").then(({ data }) => setRoutes(data.data));
  }, []);
  return (
    <div className="card">
      <h2>Student route assignment</h2>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post("/transport/assignments", form);
          const { data } = await api.get("/transport/assignments");
          setRows(data.data);
        }}
      >
        <div className="field">
          <span>Student</span>
          <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
            <option value="">Select</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Route</span>
          <select required value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
            <option value="">Select</option>
            {routes.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn">Assign</button>
      </form>
      <table>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td>{r.studentId?.name}</td>
              <td>{r.routeId?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditPage() {
  const user = useSelector((s) => s.auth.user);
  const isSuperAdmin = !!user?.isSuperAdmin;
  const [rows, setRows] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [instituteId, setInstituteId] = useState("");
  const [q, setQ] = useState("");
  const [reasonQ, setReasonQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/audit-logs", {
        params: {
          q: q || undefined,
          deleteReason: reasonQ || undefined,
          instituteId: isSuperAdmin ? instituteId || undefined : undefined
        }
      });
      setRows(data.data);
    } catch (e) {
      setErr(e.apiMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      api
        .get("/institutes")
        .then(({ data }) => setInstitutes(data.data || []))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    load();
  }, [instituteId]);

  return (
    <div className="card">
      <RbacSectionNav />
      <h2>Audit logs</h2>
      <p className="!mb-4 mt-1 text-sm text-slate-500">
        {isSuperAdmin
          ? "Platform-wide view across every institute. Narrow it down with the institute filter below."
          : "Scoped to your current institute."}
      </p>
      {err && <div className="banner error">{err}</div>}
      <div className="toolbar">
        {isSuperAdmin && (
          <select value={instituteId} onChange={(e) => setInstituteId(e.target.value)}>
            <option value="">All institutes</option>
            {institutes.map((i) => (
              <option key={i._id} value={i._id}>
                {i.name}
              </option>
            ))}
          </select>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter action" />
        <input value={reasonQ} onChange={(e) => setReasonQ(e.target.value)} placeholder="Delete reason" />
        <button className="btn secondary" onClick={load}>
          Search
        </button>
      </div>
      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <StateBlock empty={!rows.length}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  {isSuperAdmin && <th>Institute</th>}
                  <th>Actor</th>
                  <th>IP</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Delete reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    {isSuperAdmin && <td>{r.instituteId?.name || "Platform"}</td>}
                    <td>{r.actorName || r.actorId?.email || "—"}</td>
                    <td>{r.ip || "—"}</td>
                    <td>{r.action}</td>
                    <td>
                      {r.resource || r.entity} {r.resourceId || r.entityId}
                    </td>
                    <td>{r.deleteReason || "—"}</td>
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

export function StudentSelfProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    api
      .get("/portal/student/profile")
      .then(({ data }) => setProfile(data.data))
      .catch((e) => setError(e.apiMessage));
  }, []);

  async function uploadPhoto(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const { data } = await api.put("/portal/student/profile/photo", fd);
      setProfile(data.data);
      setOk("Photo updated");
      setFile(null);
    } catch (err) {
      setError(err.apiMessage);
    }
  }

  if (error && !profile) return <div className="banner error">{error}</div>;
  if (!profile) return <div className="empty">Loading…</div>;

  return (
    <div className="card">
      <h2>My profile</h2>
      <p className="text-sm text-slate-500">You can update your photo only. Name, admission number, class, and section are managed by the institute.</p>
      {ok && <div className="banner ok">{ok}</div>}
      {error && <div className="banner error">{error}</div>}
      {profile.photoUrl && (
        <img src={profile.photoUrl} alt="" className="mb-4 h-24 w-24 rounded-2xl object-cover" />
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <ReadOnly label="Name" value={profile.name} />
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <InstituteIdBadge value={profile.admissionNo} kind="student" label="Student ID" size="md" />
        </div>
        <ReadOnly label="Class" value={profile.classId?.name} />
        <ReadOnly label="Section" value={profile.sectionId?.name} />
        <ReadOnly label="Year" value={profile.academicYearId?.name} />
        <ReadOnly label="Email" value={profile.email || "—"} />
      </div>
      <form className="mt-6" onSubmit={uploadPhoto}>
        <div className="field">
          <span>Profile photo</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <button className="btn" disabled={!file}>
          Update photo
        </button>
      </form>
    </div>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );
}

export function StudentPortal() {
  const { effectivePermissions: perms, user } = useSelector((s) => s.auth);
  const [dash, setDash] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const portalAllowed = can(perms, "portal.self") || user?.isSuperAdmin;

  async function load() {
    if (!portalAllowed) return;
    setLoading(true);
    setError("");
    try {
      const [d, h] = await Promise.all([
        api.get("/student-attendance/dashboard"),
        api.get("/attendance/my", { params: { limit: 30 } })
      ]);
      setDash(d.data.data);
      setHistory(Array.isArray(h.data.data) ? h.data.data : []);
    } catch (e) {
      setError(e.apiMessage);
      toast.error(e.apiMessage);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!portalAllowed) {
      setLoading(false);
      toast.error("Student portal is only available for student accounts or administrators with portal access.");
      return;
    }
    load();
  }, [portalAllowed]);

  async function punch(kind) {
    setError("");
    try {
      await api.post(`/attendance/${kind}`, {});
      toast.success(kind === "punch-in" ? "Punched in" : "Punched out");
      load();
    } catch (e) {
      setError(e.apiMessage);
      toast.error(e.apiMessage);
    }
  }

  if (loading) return <div className="empty">Loading…</div>;
  if (error && !dash) return <div className="banner error">{error}</div>;

  const today = dash?.today;
  const isPreview = dash?.preview && !dash?.student;

  return (
    <div className="grid">
      {isPreview && (
        <div className="card border-violet-100 bg-violet-50/40">
          <h2 className="!mb-1 text-lg font-bold text-slate-900">Super Admin — student portal preview</h2>
          <p className="!mb-3 text-sm text-slate-600">
            {dash.message ||
              "Your account is not linked to a student record. Use institute tools below, or log in as a demo student to see the full portal."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/attendance" className="btn secondary !py-2 text-xs">
              Institute attendance
            </Link>
            <Link to="/students" className="btn secondary !py-2 text-xs">
              Students directory
            </Link>
            <Link to="/portal/student/assignments" className="btn ghost !py-2 text-xs">
              Portal sub-pages
            </Link>
          </div>
        </div>
      )}
      <div className="card">
        <h2>Student dashboard</h2>
        <div className="flex flex-wrap items-center gap-2">
          {dash?.student?.name ?
            <>
              <span className="font-semibold text-slate-900">{dash.student.name}</span>
              <InstituteIdBadge value={dash.student.admissionNo} kind="student" />
            </>
          : isPreview ?
            <span className="text-slate-500">No linked student — preview mode</span>
          : <span>—</span>}
        </div>
        {error && <div className="banner error">{error}</div>}
        <div className="grid stats">
          <div className="card stat">
            <h3>{dash?.summary?.totalPunchInDays || 0}</h3>
            <p>Total punch-in days</p>
          </div>
          <div className="card stat">
            <h3>{today?.punchInAt ? "In" : "—"}</h3>
            <p>Today punch-in</p>
          </div>
          <div className="card stat">
            <h3>{today?.punchOutAt ? "Out" : "—"}</h3>
            <p>Today punch-out</p>
          </div>
        </div>
        {!isPreview && (
          <div className="toolbar mt-4">
            <button className="btn" type="button" onClick={() => punch("punch-in")} disabled={today?.punchInAt}>
              Punch in
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() => punch("punch-out")}
              disabled={!today?.punchInAt || today?.punchOutAt}
            >
              Punch out
            </button>
          </div>
        )}
      </div>
      <div className="card">
        <h3>My attendance history</h3>
        <StateBlock empty={!history.length}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a._id}>
                    <td>{a.date}</td>
                    <td>{a.punchInAt ? new Date(a.punchInAt).toLocaleTimeString() : "—"}</td>
                    <td>{a.punchOutAt ? new Date(a.punchOutAt).toLocaleTimeString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StateBlock>
      </div>
    </div>
  );
}

export function StudentPortalAssignments() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api
      .get("/portal/student/assignments")
      .then(({ data }) => setRows(data.data))
      .catch((e) => setErr(e.apiMessage));
  }, []);
  if (err) return <div className="banner error">{err}</div>;
  if (!rows) return <div className="empty">Loading…</div>;
  return (
    <div className="card">
      <h2>My assignments</h2>
      <p className="text-sm text-slate-500">Class teacher and subject teachers for your section.</p>
      <p>
        <strong>Class teacher:</strong> {rows.classTeacher?.teacherId?.name || "—"}
      </p>
      <h3>Section subjects</h3>
      <StateBlock empty={!rows.sectionSubjects?.length}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Teacher</th>
              </tr>
            </thead>
            <tbody>
              {(rows.sectionSubjects || []).map((r) => (
                <tr key={r._id}>
                  <td>{r.subjectId?.name}</td>
                  <td>{r.teacherId?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
    </div>
  );
}

export function StudentPortalFees() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api
      .get("/portal/student/fees")
      .then(({ data }) => setRows(data.data))
      .catch((e) => setErr(e.apiMessage));
  }, []);
  if (err) return <div className="banner error">{err}</div>;
  return (
    <div className="card">
      <h2>Fee dues</h2>
      <StateBlock empty={!rows.length}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Payable</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f._id}>
                  <td>{f.periodKey || f.head}</td>
                  <td>{f.payable}</td>
                  <td>{f.paid ?? 0}</td>
                  <td>{f.balance ?? 0}</td>
                  <td>{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
    </div>
  );
}

export function StudentPortalResults() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api
      .get("/portal/student/results")
      .then(({ data }) => setRows(data.data))
      .catch((e) => setErr(e.apiMessage));
  }, []);
  if (err) return <div className="banner error">{err}</div>;
  return (
    <div className="card">
      <h2>Exam results</h2>
      <StateBlock empty={!rows.length}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Subject</th>
                <th>Marks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>{r.examId?.name}</td>
                  <td>{r.subjectId?.name}</td>
                  <td>
                    {r.marks}/{r.maxMarks}
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

export function StudentPortalNotices() {
  return (
    <div className="card">
      <h2>Notices & calendar</h2>
      <p className="text-sm text-slate-500">Notices, calendar, and gallery will appear here when enabled for your institute.</p>
      <div className="empty">No notices yet</div>
    </div>
  );
}

export function ParentPortal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/portal/parent")
      .then(({ data }) => setData(data.data))
      .catch((e) => setError(e.apiMessage));
  }, []);
  if (error) return <div className="banner error">{error}</div>;
  if (!data) return <div className="empty">Loading…</div>;
  if (!data.children?.length) {
    return (
      <div className="card border-violet-100 bg-violet-50/40">
        <h2 className="!mb-1 text-lg font-bold text-slate-900">
          {data.preview ? "Super Admin — parent portal preview" : "Parent portal"}
        </h2>
        <p className="!mb-0 text-sm text-slate-600">
          {data.preview ?
            data.message
          : "No linked children on this account."}
        </p>
        {data.preview && (
          <Link to="/students" className="btn secondary !mt-4 !inline-flex !py-2 text-xs">
            Students directory
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="grid">
      {data.children.map((c) => (
        <PortalView key={c.student._id} bundle={c} />
      ))}
    </div>
  );
}

function PortalView({ bundle }) {
  const s = bundle.student;
  return (
    <div className="card">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="!mb-0">{s.name}</h2>
        <InstituteIdBadge value={s.admissionNo} kind="student" />
      </div>
      <p className="text-sm text-slate-600">{s.classId?.name}</p>
      <h3>Fees</h3>
      <table>
        <thead>
          <tr>
            <th>Period / head</th>
            <th>Payable</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(bundle.fees || []).map((f) => (
            <tr key={f._id}>
              <td>{f.periodKey || f.head || f.feeStructureId?.name || "—"}</td>
              <td>{f.payable}</td>
              <td>{f.paid ?? 0}</td>
              <td>{f.balance ?? f.due ?? 0}</td>
              <td>{f.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Attendance</h3>
      <table>
        <tbody>
          {(bundle.attendance || []).slice(0, 10).map((a) => (
            <tr key={a._id}>
              <td>{a.date}</td>
              <td>{a.punchInAt ? "In" : ""} {a.punchOutAt ? "Out" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Results</h3>
      <table>
        <tbody>
          {(bundle.results || []).map((r) => (
            <tr key={r._id}>
              <td>{r.examId?.name}</td>
              <td>{r.subjectId?.name}</td>
              <td>{r.marks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
