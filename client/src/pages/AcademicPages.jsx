import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../api/client";
import { can } from "../store/authSlice";
import { toast } from "../lib/toast.js";
import SetupPanel from "../components/SetupPanel.jsx";
import StateBlock from "../components/StateBlock";
import { PageLoader } from "../components/Loading.jsx";

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function AcademicPage() {
  const { effectivePermissions: perms, user } = useSelector((s) => s.auth);
  const write = can(perms, "academic.write") || user?.isSuperAdmin;
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [y, c, s, sub, cs] = await Promise.all([
        api.get("/academic-years"),
        api.get("/classes"),
        api.get("/sections"),
        api.get("/subjects"),
        api.get("/class-subjects")
      ]);
      setYears(y.data.data || []);
      setClasses(c.data.data || []);
      setSections(s.data.data || []);
      setSubjects(sub.data.data || []);
      setClassSubjects(cs.data.data || []);
    } catch (e) {
      toast.error(e.apiMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const yearOptions = years.map((y) => ({ value: y._id, label: y.name }));
  const classOptions = classes.map((c) => ({ value: c._id, label: c.name }));

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <PageLoader label="Loading academic setup…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader refreshing={refreshing} onRefresh={() => load(true)} />

      <SetupPanel
        title="Academic years"
        description="Session timeline — classes and sections belong to a year."
        recordLabel="Academic year"
        rows={years}
        searchKeys={["name"]}
        canWrite={write}
        busy={refreshing}
        fields={[
          { name: "name", label: "Session name", placeholder: "2025–26" },
          { name: "startDate", label: "Start date", type: "date" },
          { name: "endDate", label: "End date", type: "date" }
        ]}
        columns={[
          { key: "name", label: "Name" },
          { key: "startDate", label: "Start", render: (r) => fmtDate(r.startDate) },
          { key: "endDate", label: "End", render: (r) => fmtDate(r.endDate) },
          {
            key: "isCurrent",
            label: "Current",
            render: (r) =>
              r.isCurrent ?
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Yes</span>
              : "—"
          }
        ]}
        onSubmit={async (f) => {
          await api.post("/academic-years", { ...f, isCurrent: true });
          await load(true);
        }}
      />

      <SetupPanel
        title="Subjects"
        description="Institute subject catalogue — assign teachers on Time table / Assignments."
        recordLabel="Subject"
        rows={subjects}
        searchKeys={["name", "code"]}
        canWrite={write}
        busy={refreshing}
        fields={[
          { name: "name", label: "Subject name", placeholder: "Mathematics" },
          { name: "code", label: "Code", placeholder: "MATH" }
        ]}
        columns={[
          { key: "name", label: "Name" },
          { key: "code", label: "Code" }
        ]}
        onSubmit={async (f) => {
          await api.post("/subjects", f);
          await load(true);
        }}
      />

      <SetupPanel
        title="Classes"
        description="Create classes under an academic year before sections and fee mapping."
        recordLabel="Class"
        rows={classes}
        searchKeys={["name"]}
        canWrite={write}
        busy={refreshing}
        fields={[
          { name: "name", label: "Class name", placeholder: "Class 10" },
          { name: "academicYearId", label: "Academic year", type: "select", options: yearOptions }
        ]}
        columns={[
          { key: "name", label: "Class" },
          { key: "academicYearId", label: "Year", render: (r) => r.academicYearId?.name || "—" }
        ]}
        onSubmit={async (f) => {
          await api.post("/classes", f);
          await load(true);
        }}
      />

      <SetupPanel
        title="Class subjects"
        description="Attach subjects to a class before teacher assignment (Assignments page)."
        recordLabel="Class subject"
        rows={classSubjects}
        searchKeys={["classId", "subjectId"]}
        canWrite={write}
        busy={refreshing}
        fields={[
          { name: "classId", label: "Class", type: "select", options: classOptions },
          {
            name: "subjectId",
            label: "Subject",
            type: "select",
            options: subjects.map((s) => ({ value: s._id, label: s.name }))
          }
        ]}
        columns={[
          { key: "classId", label: "Class", render: (r) => r.classId?.name || "—" },
          { key: "subjectId", label: "Subject", render: (r) => r.subjectId?.name || "—" }
        ]}
        onSubmit={async (f) => {
          await api.post("/class-subjects", f);
          await load(true);
        }}
      />

      <SetupPanel
        title="Sections"
        description="Sections live under a class — used for students, attendance, and timetables."
        recordLabel="Section"
        rows={sections}
        searchKeys={["name"]}
        canWrite={write}
        busy={refreshing}
        fields={[
          { name: "name", label: "Section name", placeholder: "A" },
          { name: "classId", label: "Class", type: "select", options: classOptions },
          { name: "academicYearId", label: "Academic year", type: "select", options: yearOptions }
        ]}
        columns={[
          { key: "name", label: "Section" },
          { key: "classId", label: "Class", render: (r) => r.classId?.name || "—" },
          { key: "academicYearId", label: "Year", render: (r) => r.academicYearId?.name || "—" }
        ]}
        onSubmit={async (f) => {
          await api.post("/sections", f);
          await load(true);
        }}
      />
    </div>
  );
}

function PageHeader({ refreshing, onRefresh }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="!mb-1 text-2xl font-bold tracking-tight text-slate-900">Academic setup</h1>
        <p className="!mb-0 max-w-2xl text-sm text-slate-500">
          Years → subjects → classes → class subjects → sections. Each step unlocks the next across Students and
          Assignments.
        </p>
      </div>
      <button type="button" className="btn secondary !py-2 text-xs font-semibold" disabled={refreshing} onClick={onRefresh}>
        {refreshing ? "Refreshing…" : "Refresh data"}
      </button>
    </div>
  );
}

export function AssignmentsPage() {
  const { effectivePermissions: perms, user } = useSelector((s) => s.auth);
  const write = can(perms, "assignment.write") || user?.isSuperAdmin;
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [cst, setCst] = useState([]);
  const [sct, setSct] = useState([]);
  const [sst, setSst] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [t, c, s, sub, csub, st, a, b, d] = await Promise.all([
        api.get("/employees/eligible-teachers"),
        api.get("/classes"),
        api.get("/sections"),
        api.get("/subjects"),
        api.get("/class-subjects"),
        api.get("/assignments/subject-teachers"),
        api.get("/assignments/class-subject-teachers"),
        api.get("/assignments/section-class-teachers"),
        api.get("/assignments/section-subject-teachers")
      ]);
      setTeachers(t.data.data || []);
      setClasses(c.data.data || []);
      setSections(s.data.data || []);
      setSubjects(sub.data.data || []);
      setClassSubjects(csub.data.data || []);
      setSubjectTeachers(st.data.data || []);
      setCst(a.data.data || []);
      setSct(b.data.data || []);
      setSst(d.data.data || []);
    } catch (e) {
      toast.error(e.apiMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function post(path, body) {
    setSaving(true);
    try {
      await api.post(path, body);
      toast.success("Assignment saved");
      await load();
    } catch (e) {
      toast.error(e.apiMessage);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Teacher assignments</h1>
        <PageLoader label="Loading assignments…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="!mb-1 text-2xl font-bold tracking-tight text-slate-900">Teacher assignments</h1>
        <p className="!mb-0 max-w-3xl text-sm text-slate-500">
          Subjects → teachers → class subjects → section homeroom & subject teachers. The API enforces the same order.
        </p>
      </div>

      <div className="card space-y-4">
        <h3 className="!mb-0 text-base font-bold text-slate-900">Step 1 · Subject ↔ teacher</h3>
        {write && (
          <SubjectTeacherForm subjects={subjects} teachers={teachers} disabled={saving} onSubmit={(f) => post("/assignments/subject-teachers", f)} />
        )}
        <AssignmentTable rows={subjectTeachers} headers={["Subject", "Teacher"]} cells={(r) => [r.subjectId?.name, r.teacherId?.name]} />
      </div>

      <div className="card space-y-4">
        <h3 className="!mb-0 text-base font-bold text-slate-900">Step 2 · Class subject teacher</h3>
        <p className="!mb-0 text-xs text-slate-500">Only teachers eligible for the subject (step 1) appear here.</p>
        {write && (
          <ClassSubjectTeacherForm
            classes={classes}
            classSubjects={classSubjects}
            subjectTeachers={subjectTeachers}
            disabled={saving}
            onSubmit={(f) => post("/assignments/class-subject-teachers", f)}
          />
        )}
        <AssignmentTable rows={cst} headers={["Class", "Subject", "Teacher"]} cells={(r) => [r.classId?.name, r.subjectId?.name, r.teacherId?.name]} />
      </div>

      <div className="card space-y-4">
        <h3 className="!mb-0 text-base font-bold text-slate-900">Step 3 · Section teachers</h3>
        {write && (
          <>
            <ClassTeacherForm sections={sections} teachers={teachers} disabled={saving} onSubmit={(f) => post("/assignments/section-class-teachers", f)} />
            <SectionSubjectTeacherForm sections={sections} cst={cst} disabled={saving} onSubmit={(f) => post("/assignments/section-subject-teachers", f)} />
          </>
        )}
        <h4 className="text-sm font-semibold text-slate-700">Section class teachers</h4>
        <AssignmentTable rows={sct} headers={["Section", "Class teacher"]} cells={(r) => [r.sectionId?.name, r.teacherId?.name]} />
        <h4 className="text-sm font-semibold text-slate-700">Section subject teachers</h4>
        <AssignmentTable rows={sst} headers={["Section", "Subject", "Teacher"]} cells={(r) => [r.sectionId?.name, r.subjectId?.name, r.teacherId?.name]} />
      </div>
    </div>
  );
}

function AssignmentTable({ rows, headers, cells }) {
  return (
    <StateBlock empty={!rows.length} emptyText="No assignments yet">
      <div className="table-scroll rounded-xl border border-slate-100">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                {cells(r).map((c, i) => (
                  <td key={i}>{c || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StateBlock>
  );
}

function SubjectTeacherForm({ subjects, teachers, onSubmit, disabled }) {
  const [form, setForm] = useState({ subjectId: "", teacherId: "" });
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(form);
        setForm({ subjectId: "", teacherId: "" });
      }}
    >
      <SelectField label="Subject" value={form.subjectId} onChange={(v) => setForm({ ...form, subjectId: v })} options={subjects.map((s) => ({ value: s._id, label: s.name }))} />
      <SelectField label="Teacher" value={form.teacherId} onChange={(v) => setForm({ ...form, teacherId: v })} options={teachers.map((t) => ({ value: t._id, label: t.name }))} />
      <div className="field">
        <span>&nbsp;</span>
        <button className="btn" disabled={disabled}>
          {disabled ? "Saving…" : "Assign"}
        </button>
      </div>
    </form>
  );
}

function ClassSubjectTeacherForm({ classes, classSubjects, subjectTeachers, onSubmit, disabled }) {
  const [form, setForm] = useState({ classId: "", subjectId: "", teacherId: "" });
  const subjectOptions = classSubjects
    .filter((cs) => String(cs.classId?._id || cs.classId) === String(form.classId))
    .map((cs) => ({ value: cs.subjectId._id, label: cs.subjectId.name }));
  const teacherOptions = subjectTeachers
    .filter((st) => String(st.subjectId?._id || st.subjectId) === String(form.subjectId))
    .map((st) => ({ value: st.teacherId._id, label: st.teacherId.name }));

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(form);
        setForm({ classId: "", subjectId: "", teacherId: "" });
      }}
    >
      <SelectField label="Class" value={form.classId} onChange={(v) => setForm({ classId: v, subjectId: "", teacherId: "" })} options={classes.map((c) => ({ value: c._id, label: c.name }))} />
      <SelectField label="Class subject" value={form.subjectId} onChange={(v) => setForm({ ...form, subjectId: v, teacherId: "" })} options={subjectOptions} disabled={!form.classId} hint={form.classId && !subjectOptions.length ? "Attach subjects to this class in Academic setup" : ""} />
      <SelectField label="Eligible teacher" value={form.teacherId} onChange={(v) => setForm({ ...form, teacherId: v })} options={teacherOptions} disabled={!form.subjectId} hint={form.subjectId && !teacherOptions.length ? "Complete step 1 for this subject" : ""} />
      <div className="field">
        <span>&nbsp;</span>
        <button className="btn" disabled={disabled || !form.classId || !form.subjectId || !form.teacherId}>
          {disabled ? "Saving…" : "Assign"}
        </button>
      </div>
    </form>
  );
}

function ClassTeacherForm({ sections, teachers, onSubmit, disabled }) {
  const [form, setForm] = useState({ sectionId: "", teacherId: "" });
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(form);
        setForm({ sectionId: "", teacherId: "" });
      }}
    >
      <SelectField label="Section" value={form.sectionId} onChange={(v) => setForm({ ...form, sectionId: v })} options={sections.map((s) => ({ value: s._id, label: s.name }))} />
      <SelectField label="Class teacher" value={form.teacherId} onChange={(v) => setForm({ ...form, teacherId: v })} options={teachers.map((t) => ({ value: t._id, label: t.name }))} />
      <div className="field">
        <span>&nbsp;</span>
        <button className="btn" disabled={disabled}>
          {disabled ? "Saving…" : "Assign homeroom"}
        </button>
      </div>
    </form>
  );
}

function SectionSubjectTeacherForm({ sections, cst, onSubmit, disabled }) {
  const [form, setForm] = useState({ sectionId: "", subjectId: "" });
  const section = sections.find((s) => s._id === form.sectionId);
  const classId = section ? section.classId?._id || section.classId : null;
  const eligibleForClass = cst.filter((c) => String(c.classId?._id || c.classId) === String(classId));
  const subjectOptions = eligibleForClass.map((c) => ({ value: c.subjectId._id, label: c.subjectId.name }));
  const chosen = eligibleForClass.find((c) => c.subjectId._id === form.subjectId);

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!chosen) return;
        await onSubmit({ sectionId: form.sectionId, subjectId: form.subjectId, teacherId: chosen.teacherId._id });
        setForm({ sectionId: "", subjectId: "" });
      }}
    >
      <SelectField label="Section" value={form.sectionId} onChange={(v) => setForm({ sectionId: v, subjectId: "" })} options={sections.map((s) => ({ value: s._id, label: s.name }))} />
      <SelectField label="Class subject" value={form.subjectId} onChange={(v) => setForm({ ...form, subjectId: v })} options={subjectOptions} disabled={!form.sectionId} hint={form.sectionId && !subjectOptions.length ? "Complete step 2 for this class" : ""} />
      <div className="field">
        <span>Teacher (from step 2)</span>
        <input disabled value={chosen ? chosen.teacherId.name : ""} placeholder="Pick class subject" />
      </div>
      <div className="field">
        <span>&nbsp;</span>
        <button className="btn" disabled={disabled || !chosen}>
          {disabled ? "Saving…" : "Assign to section"}
        </button>
      </div>
    </form>
  );
}

function SelectField({ label, value, onChange, options, disabled, hint }) {
  return (
    <div className="field">
      <span>{label}</span>
      <select required disabled={disabled} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="!mb-0 mt-1 text-[11px] font-medium text-amber-700">{hint}</p>}
    </div>
  );
}
