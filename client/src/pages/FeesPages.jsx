import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../api/client";
import { can } from "../store/authSlice";
import StateBlock from "../components/StateBlock";
import { InstituteIdBadge } from "../components/InstituteIdBadge.jsx";

const CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-yearly" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One-time" }
];

function StatusChip({ status }) {
  const tone =
    status === "paid"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
      : status === "overdue"
        ? "bg-rose-50 text-rose-700 border border-rose-200/60"
        : status === "partial"
          ? "bg-amber-50 text-amber-700 border border-amber-200/60"
          : "bg-slate-50 text-slate-600 border border-slate-200/60";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${tone}`}>{status}</span>;
}

export function FeesHomePage() {
  const [dash, setDash] = useState(null);
  const perms = useSelector((s) => s.auth.effectivePermissions);

  useEffect(() => {
    api.get("/fees/dashboard").then(({ data }) => setDash(data.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {dash && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card stat">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Outstanding Due</p>
              <h3 className="mt-1 text-2xl sm:text-3xl font-black text-rose-600">
                ₹{Number(dash.outstanding ?? dash.due ?? 0).toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="stat-arrow-btn">
              <span className="text-xs font-bold">DUE</span>
            </div>
          </div>
          <div className="card stat">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Total Collected</p>
              <h3 className="mt-1 text-2xl sm:text-3xl font-black text-emerald-600">
                ₹{Number(dash.paid ?? 0).toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="stat-arrow-btn !bg-emerald-50 !text-emerald-600">
              <span className="text-xs font-bold">REC</span>
            </div>
          </div>
          <div className="card stat">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Overdue Invoices</p>
              <h3 className="mt-1 text-2xl sm:text-3xl font-black text-amber-600">
                {dash.statusCounts?.overdue || 0}
              </h3>
            </div>
            <div className="stat-arrow-btn !bg-amber-50 !text-amber-600">
              <span className="text-xs font-bold">OVD</span>
            </div>
          </div>
          <div className="card stat">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Total Installments</p>
              <h3 className="mt-1 text-2xl sm:text-3xl font-black text-blue-600">
                {dash.dueCount || 0}
              </h3>
            </div>
            <div className="stat-arrow-btn">
              <span className="text-xs font-bold">ALL</span>
            </div>
          </div>
        </div>
      )}
      <div className="card space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 !mb-1">Fee &amp; Finance Management</h2>
          <p className="text-xs text-slate-400 !mb-0">Configure fee structures, enroll student batches, collect installments, and monitor collection reports.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 pt-2">
          {can(perms, "fees.structure") && (
            <Link className="btn secondary !py-2 !px-4 text-xs font-semibold" to="/fees/structures">
              Fee Structures
            </Link>
          )}
          {can(perms, "fees.assign") && (
            <Link className="btn secondary !py-2 !px-4 text-xs font-semibold" to="/fees/enrollments">
              Batch Enrollments
            </Link>
          )}
          <Link className="btn secondary !py-2 !px-4 text-xs font-semibold" to="/fees/dues">
            Student Dues &amp; Ledger
          </Link>
          {can(perms, "fees.collect") && (
            <Link className="btn !py-2 !px-4 text-xs font-semibold" to="/fees/collect">
              Collect Payment
            </Link>
          )}
          {can(perms, "fees.reports") && (
            <Link className="btn ghost !py-2 !px-4 text-xs font-semibold" to="/fees/reports">
              Collection Reports
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeeStructuresPage() {
  const [rows, setRows] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState({ name: "", code: "", billingCycle: "monthly", academicYearId: "" });
  const [err, setErr] = useState("");

  async function load() {
    const [s, y] = await Promise.all([api.get("/fees/structures"), api.get("/academic-years")]);
    setRows(s.data.data);
    setYears(y.data.data || []);
  }
  useEffect(() => {
    load().catch((e) => setErr(e.apiMessage));
  }, []);

  return (
    <div className="card">
      <h2>Fee structures</h2>
      {err && <div className="banner error">{err}</div>}
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.post("/fees/structures", { ...form, academicYearId: form.academicYearId || undefined });
            load();
          } catch (ex) {
            setErr(ex.apiMessage);
          }
        }}
      >
        <div className="field">
          <span>Name</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <span>Code</span>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div className="field">
          <span>Billing cycle</span>
          <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
            {CYCLES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Academic year</span>
          <select value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}>
            <option value="">Optional</option>
            {years.map((y) => (
              <option key={y._id} value={y._id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>&nbsp;</span>
          <button className="btn">Create structure</button>
        </div>
      </form>
      <StateBlock empty={!rows.length}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Cycle</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.name}</td>
                <td>{r.billingCycle}</td>
                <td>{r.isActive ? "Yes" : "No"}</td>
                <td>
                  <Link to={`/fees/structures/${r._id}`}>Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StateBlock>
    </div>
  );
}

export function FeeStructureDetailPage() {
  const { id } = useParams();
  const [structure, setStructure] = useState(null);
  const [components, setComponents] = useState([]);
  const [compForm, setCompForm] = useState({ name: "", amount: "", code: "" });
  const [err, setErr] = useState("");

  async function load() {
    const [s, c] = await Promise.all([api.get(`/fees/structures/${id}`), api.get(`/fees/structures/${id}/components`)]);
    setStructure(s.data.data);
    setComponents(c.data.data);
  }
  useEffect(() => {
    load().catch((e) => setErr(e.apiMessage));
  }, [id]);

  const total = useMemo(() => components.reduce((s, c) => s + Number(c.amount || 0), 0), [components]);

  if (!structure) return <div className="empty">Loading…</div>;

  return (
    <div className="grid">
      <div className="card">
        <h2>{structure.name}</h2>
        <p>
          {structure.billingCycle} · Components total: {total}
        </p>
        {err && <div className="banner error">{err}</div>}
      </div>
      <div className="card">
        <h3>Fee components</h3>
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post(`/fees/structures/${id}/components`, compForm);
              setCompForm({ name: "", amount: "", code: "" });
              load();
            } catch (ex) {
              setErr(ex.apiMessage);
            }
          }}
        >
          <div className="field">
            <span>Name</span>
            <input required value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} />
          </div>
          <div className="field">
            <span>Amount</span>
            <input required type="number" min="0" value={compForm.amount} onChange={(e) => setCompForm({ ...compForm, amount: e.target.value })} />
          </div>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn">Add component</button>
          </div>
        </form>
        <StateBlock empty={!components.length}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.amount}</td>
                  <td>{c.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </StateBlock>
      </div>
    </div>
  );
}

export function FeeEnrollmentsPage() {
  const [students, setStudents] = useState([]);
  const [structures, setStructures] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    mode: "single",
    studentId: "",
    classId: "",
    sectionId: "",
    feeStructureId: "",
    academicYearId: "",
    discountType: "fixed",
    discountValue: "0",
    maxDiscountCap: "",
    generateDues: true,
    dueDateOffsetDays: "0"
  });

  useEffect(() => {
    Promise.all([
      api.get("/students"),
      api.get("/fees/structures", { params: { active: true } }),
      api.get("/academic-years"),
      api.get("/classes"),
      api.get("/sections")
    ])
      .then(([st, fs, y, cl, se]) => {
        setStudents(st.data.data);
        setStructures(fs.data.data);
        setYears(y.data.data);
        setClasses(cl.data.data);
        setSections(se.data.data);
      })
      .catch((e) => setErr(e.apiMessage));
  }, []);

  useEffect(() => {
    if (!form.feeStructureId) return;
    api
      .get(`/fees/structures/${form.feeStructureId}/components`)
      .then(({ data }) => {
        const gross = (data.data || []).reduce((s, c) => s + Number(c.amount), 0);
        const dv = Number(form.discountValue || 0);
        const cap = form.maxDiscountCap !== "" ? Number(form.maxDiscountCap) : null;
        let disc = form.discountType === "percent" ? (gross * dv) / 100 : dv;
        if (cap != null) disc = Math.min(disc, cap);
        disc = Math.min(disc, gross);
        setPreview({ gross, discountAmount: Math.round(disc * 100) / 100, payable: Math.round((gross - disc) * 100) / 100 });
      })
      .catch(() => setPreview(null));
  }, [form.feeStructureId, form.discountType, form.discountValue, form.maxDiscountCap]);

  return (
    <div className="card">
      <h2>Assign fee structure to students</h2>
      {msg && <div className="banner ok">{msg}</div>}
      {err && <div className="banner error">{err}</div>}
      {preview && (
        <p className="text-sm text-slate-600">
          Per period preview — Gross: {preview.gross}, Discount: {preview.discountAmount}, Payable: {preview.payable}
        </p>
      )}
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          setMsg("");
          const body = {
            feeStructureId: form.feeStructureId,
            academicYearId: form.academicYearId,
            discountType: form.discountType,
            discountValue: Number(form.discountValue),
            maxDiscountCap: form.maxDiscountCap === "" ? undefined : Number(form.maxDiscountCap),
            generateDues: form.generateDues,
            dueDateOffsetDays: Number(form.dueDateOffsetDays || 0)
          };
          try {
            if (form.mode === "bulk") {
              const { data } = await api.post("/fees/enrollments/bulk", {
                ...body,
                classId: form.classId || undefined,
                sectionId: form.sectionId || undefined
              });
              setMsg(`Enrolled ${data.data.created} students${data.data.errors?.length ? `, ${data.data.errors.length} skipped` : ""}`);
            } else {
              await api.post("/fees/enrollments", { ...body, studentId: form.studentId });
              setMsg("Student enrolled");
            }
          } catch (ex) {
            setErr(ex.apiMessage);
          }
        }}
      >
        <div className="field">
          <span>Mode</span>
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <option value="single">Single student</option>
            <option value="bulk">Bulk class/section</option>
          </select>
        </div>
        {form.mode === "single" ? (
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
        ) : (
          <>
            <div className="field">
              <span>Class</span>
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">Any</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>Section</span>
              <select value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })}>
                <option value="">Any</option>
                {sections.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="field">
          <span>Structure</span>
          <select required value={form.feeStructureId} onChange={(e) => setForm({ ...form, feeStructureId: e.target.value })}>
            <option value="">Select</option>
            {structures.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.billingCycle})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Academic year</span>
          <select required value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}>
            <option value="">Select</option>
            {years.map((y) => (
              <option key={y._id} value={y._id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Discount type</span>
          <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
            <option value="fixed">Fixed</option>
            <option value="percent">Percent</option>
          </select>
        </div>
        <div className="field">
          <span>Discount value</span>
          <input type="number" min="0" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
        </div>
        <div className="field">
          <span>Max discount cap</span>
          <input type="number" min="0" placeholder="Optional" value={form.maxDiscountCap} onChange={(e) => setForm({ ...form, maxDiscountCap: e.target.value })} />
        </div>
        <div className="field">
          <span>Generate dues now</span>
          <input type="checkbox" checked={form.generateDues} onChange={(e) => setForm({ ...form, generateDues: e.target.checked })} />
        </div>
        <div className="field">
          <span>&nbsp;</span>
          <button className="btn">Enroll</button>
        </div>
      </form>
    </div>
  );
}

export function FeeDuesPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const params = {};
    if (status) params.status = status;
    if (overdue) params.overdue = "true";
    const { data } = await api.get("/fees/dues", { params });
    setRows(data.data);
  }
  useEffect(() => {
    load().catch((e) => setErr(e.apiMessage));
  }, [status, overdue]);

  return (
    <div className="card">
      <h2>Student fee dues</h2>
      {err && <div className="banner error">{err}</div>}
      <div className="form-grid mb-4">
        <div className="field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="field">
          <span>Overdue only</span>
          <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />
        </div>
      </div>
      <StateBlock empty={!rows.length}>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Period</th>
              <th>Due date</th>
              <th>Payable</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.studentId?.name}</td>
                <td>{r.periodKey}</td>
                <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}</td>
                <td>{r.payable}</td>
                <td>{r.paid}</td>
                <td>{r.balance}</td>
                <td>
                  <StatusChip status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StateBlock>
    </div>
  );
}

export function FeeCollectPage() {
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const [dues, setDues] = useState([]);
  const [form, setForm] = useState({ feeDueId: "", amount: "", method: "cash", notes: "" });
  const [receipt, setReceipt] = useState(null);
  const [lastPaymentId, setLastPaymentId] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/fees/dues")
      .then(({ data }) => setDues(data.data.filter((d) => d.balance > 0)))
      .catch((e) => setErr(e.apiMessage));
  }, []);

  const selected = dues.find((d) => d._id === form.feeDueId);

  return (
    <div className="grid">
      <div className="card">
        <h2>Collect payment</h2>
        {err && <div className="banner error">{err}</div>}
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const { data } = await api.post("/fees/payments", form);
              setLastPaymentId(data.data.payment._id);
              const rec = await api.get(`/fees/receipts/${data.data.payment._id}`);
              setReceipt(rec.data.data);
              setForm({ feeDueId: "", amount: "", method: "cash", notes: "" });
              const list = await api.get("/fees/dues");
              setDues(list.data.data.filter((d) => d.balance > 0));
            } catch (ex) {
              setErr(ex.apiMessage);
            }
          }}
        >
          <div className="field">
            <span>Due installment</span>
            <select required value={form.feeDueId} onChange={(e) => setForm({ ...form, feeDueId: e.target.value, amount: "" })}>
              <option value="">Select</option>
              {dues.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.studentId?.name} · {d.periodKey} · balance {d.balance}
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <div className="field">
              <span>Balance</span>
              <input readOnly value={selected.balance} />
            </div>
          )}
          <div className="field">
            <span>Amount</span>
            <input required type="number" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="field">
            <span>Method</span>
            <input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
          </div>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn">Record payment</button>
          </div>
        </form>
      </div>
      {receipt && (
        <div className="card print:border print:shadow-none" id="fee-receipt">
          <h3>Receipt {receipt.receiptNo}</h3>
          <p>{receipt.institute?.name}</p>
          <p className="flex flex-wrap items-center gap-2">
            <span>{receipt.student?.name}</span>
            <InstituteIdBadge value={receipt.student?.admissionNo} kind="student" />
          </p>
          <p>Amount: {receipt.amount} · {receipt.method}</p>
          <p>{new Date(receipt.paidAt).toLocaleString()}</p>
          {receipt.due && <p>Period: {receipt.due.periodKey}</p>}
          <button type="button" className="btn secondary mt-2" onClick={() => window.print()}>
            Print
          </button>
          {can(perms, "fees.refund") && lastPaymentId && (
            <RefundForm paymentId={lastPaymentId} onDone={() => { setReceipt(null); setLastPaymentId(""); }} />
          )}
        </div>
      )}
    </div>
  );
}

function RefundForm({ paymentId, onDone }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  return (
    <form
      className="mt-4 border-t pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.post(`/fees/payments/${paymentId}/refund`, { amount: Number(amount), reason });
          onDone();
        } catch (ex) {
          setErr(ex.apiMessage);
        }
      }}
    >
      <h4>Refund this payment</h4>
      {err && <div className="banner error">{err}</div>}
      <div className="field">
        <span>Amount</span>
        <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field">
        <span>Reason</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button className="btn secondary">Issue refund</button>
    </form>
  );
}

export function FeeReportsPage() {
  const [tab, setTab] = useState("collections");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [collections, setCollections] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [summary, setSummary] = useState([]);

  async function load() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (tab === "collections") {
      const { data } = await api.get("/fees/reports/collections", { params });
      setCollections(data.data);
    } else if (tab === "outstanding") {
      const { data } = await api.get("/fees/reports/outstanding", { params: { overdue: "true" } });
      setOutstanding(data.data);
    } else {
      const { data } = await api.get("/fees/reports/structure-summary");
      setSummary(data.data);
    }
  }
  useEffect(() => {
    load().catch(() => {});
  }, [tab, from, to]);

  return (
    <div className="card">
      <h2>Fee reports</h2>
      <div className="flex gap-2 mb-4">
        {["collections", "outstanding", "structures"].map((t) => (
          <button key={t} type="button" className={`btn ${tab === t ? "" : "secondary"}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {(tab === "collections") && (
        <div className="form-grid mb-4">
          <div className="field">
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}
      {tab === "collections" && (
        <StateBlock empty={!collections.length}>
          <table>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Student</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((r) => (
                <tr key={r._id}>
                  <td>{r.receiptNo}</td>
                  <td>{r.studentId?.name}</td>
                  <td>{r.amount}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </StateBlock>
      )}
      {tab === "outstanding" && (
        <StateBlock empty={!outstanding.length}>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Period</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.map((r) => (
                <tr key={r._id}>
                  <td>{r.studentId?.name}</td>
                  <td>{r.periodKey}</td>
                  <td>{r.balance}</td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </StateBlock>
      )}
      {tab === "structures" && (
        <StateBlock empty={!summary.length}>
          <table>
            <thead>
              <tr>
                <th>Structure</th>
                <th>Enrolled</th>
                <th>Expected</th>
                <th>Collected</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.structure._id}>
                  <td>{r.structure.name}</td>
                  <td>{r.enrolledCount}</td>
                  <td>{r.expected}</td>
                  <td>{r.collected}</td>
                  <td>{r.outstanding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </StateBlock>
      )}
    </div>
  );
}

/** @deprecated use FeesHomePage */
export function FeesPage() {
  return <FeesHomePage />;
}
