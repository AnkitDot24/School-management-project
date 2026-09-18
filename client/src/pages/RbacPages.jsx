import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../api/client";
import { toast } from "../lib/toast.js";
import { can } from "../store/authSlice";
import StateBlock from "../components/StateBlock";
import { RbacSectionNav } from "../components/RbacSectionNav.jsx";
import { InstituteIdBadge } from "../components/InstituteIdBadge.jsx";
import { roleLabel } from "../constants/instituteRoles.js";

export function RolesPage() {
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(null);
  const [keys, setKeys] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [r, p] = await Promise.all([api.get("/roles"), api.get("/permissions")]);
      setRoles(r.data.data);
      setCatalog(p.data.data);
    } catch (e) {
      setError(e.apiMessage);
      toast.error(e.apiMessage);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function pick(role) {
    setSelected(role);
    setKeys((role.permissions || []).map((p) => p.key));
  }

  return (
    <div className="card">
      <RbacSectionNav />
      <h2>Roles & permission mapping</h2>
      <p>A role does not grant actions by itself. Only attached permissions do.</p>
      <StateBlock error={error} empty={!roles.length} emptyText="No roles">
        <div className="tabs">
          {roles.map((r) => (
            <button
              key={r._id}
              className={`btn !py-2 !px-3.5 text-xs font-semibold ${selected?._id === r._id ? "" : "secondary"}`}
              onClick={() => pick(r)}
            >
              {r.code}
            </button>
          ))}
        </div>
        {selected && (
          <div>
            <h3>{selected.name}</h3>
            <div className="form-grid">
              {catalog.map((p) => (
                <label key={p._id}>
                  <input
                    type="checkbox"
                    disabled={!can(perms, "rbac.manage")}
                    checked={keys.includes(p.key)}
                    onChange={(e) =>
                      setKeys(e.target.checked ? [...keys, p.key] : keys.filter((k) => k !== p.key))
                    }
                  />{" "}
                  {p.key}
                </label>
              ))}
            </div>
            {can(perms, "rbac.manage") && (
              <button
                className="btn"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  await api.put(`/roles/${selected._id}/permissions`, { permissionKeys: keys });
                  toast.success("Permissions saved");
                  load();
                }}
              >
                Save permissions
              </button>
            )}
          </div>
        )}
      </StateBlock>
    </div>
  );
}

export function MembershipsPage() {
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ email: "", roleCodes: [], primaryRoleCode: "", validFrom: "", validTill: "" });
  const [nextMemberCode, setNextMemberCode] = useState("");
  const [error, setError] = useState("");
  const perms = useSelector((s) => s.auth.effectivePermissions);

  async function load() {
    try {
      const [m, r] = await Promise.all([api.get("/memberships"), api.get("/roles")]);
      setRows(m.data.data);
      setRoles(r.data.data);
    } catch (e) {
      setError(e.apiMessage);
      toast.error(e.apiMessage);
    }
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.roleCodes.length) {
      setForm((f) => (f.primaryRoleCode ? { ...f, primaryRoleCode: "" } : f));
      return;
    }
    setForm((f) => {
      if (f.primaryRoleCode && form.roleCodes.includes(f.primaryRoleCode)) return f;
      return { ...f, primaryRoleCode: form.roleCodes[0] };
    });
  }, [form.roleCodes]);

  useEffect(() => {
    const primary = form.primaryRoleCode || form.roleCodes[0];
    if (!can(perms, "membership.manage") || !primary) {
      setNextMemberCode("");
      return;
    }
    api
      .get("/memberships/next-code", { params: { roleCode: primary } })
      .then(({ data }) => setNextMemberCode(data.data?.memberCode || ""))
      .catch(() => setNextMemberCode(""));
  }, [form.primaryRoleCode, form.roleCodes, perms]);

  return (
    <div className="card">
      <RbacSectionNav />
      <h2>Memberships</h2>
      {can(perms, "membership.manage") && (
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const roleCodes =
              form.primaryRoleCode && form.roleCodes.includes(form.primaryRoleCode)
                ? [form.primaryRoleCode, ...form.roleCodes.filter((c) => c !== form.primaryRoleCode)]
                : form.roleCodes;
            await api.post("/memberships", { ...form, roleCodes });
            toast.success("Membership added");
            load();
          }}
        >
          <div className="field">
            <span>User email</span>
            <input required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <span>Roles</span>
            <select
              multiple
              value={form.roleCodes}
              onChange={(e) => setForm({ ...form, roleCodes: [...e.target.selectedOptions].map((o) => o.value) })}
            >
              {[...roles]
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((r) => (
                  <option key={r._id} value={r.code}>
                    {r.code} — {roleLabel(r.code)}
                  </option>
                ))}
            </select>
          </div>
          {form.roleCodes.length > 0 && (
            <div className="field">
              <span>Member ID prefix (primary role)</span>
              <select
                value={form.primaryRoleCode || form.roleCodes[0] || ""}
                onChange={(e) => setForm({ ...form, primaryRoleCode: e.target.value })}
              >
                {form.roleCodes.map((code) => (
                  <option key={code} value={code}>
                    {code} — {roleLabel(code)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {form.roleCodes.length > 0 && (
            <div className="field">
              <span>Next member ID</span>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                <InstituteIdBadge value={nextMemberCode || "···-······"} />
                <span className="text-[11px] text-slate-500">
                  For {roleLabel(form.primaryRoleCode || form.roleCodes[0])} · assigned on save
                </span>
              </div>
            </div>
          )}
          <div className="field">
            <span>Valid from</span>
            <input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          </div>
          <div className="field">
            <span>Valid till</span>
            <input type="date" value={form.validTill} onChange={(e) => setForm({ ...form, validTill: e.target.value })} />
          </div>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn">Add membership</button>
          </div>
        </form>
      )}
      <StateBlock empty={!rows.length} emptyText="No active memberships">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member ID</th>
                <th>User Email</th>
                <th>Status</th>
                <th>Roles &amp; Validity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>
                    <InstituteIdBadge value={r.memberCode} />
                  </td>
                  <td className="font-bold text-slate-900">{r.userId?.email}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      r.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-slate-600">
                      {(r.roles || [])
                        .map((x) => `${x.roleId?.code} (${x.validFrom?.slice(0, 10)}–${x.validTill?.slice(0, 10) || "open"})`)
                        .join(", ")}
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

export function GrantsPage() {
  return <GrantLike title="Temporary grants" path="/temporary-grants" extraFields />;
}

export function OverridesPage() {
  return <GrantLike title="User permission overrides" path="/permission-overrides" override />;
}

function GrantLike({ title, path, extraFields, override }) {
  const [rows, setRows] = useState([]);
  const [perms, setPerms] = useState([]);
  const [form, setForm] = useState({ userId: "", permissionKey: "", reason: "", validFrom: "", validTill: "", effect: "allow" });
  const authPerms = useSelector((s) => s.auth.effectivePermissions);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [a, b] = await Promise.all([api.get(path), api.get("/permissions")]);
      setRows(a.data.data);
      setPerms(b.data.data);
    } catch (e) {
      setError(e.apiMessage);
      toast.error(e.apiMessage);
    }
  }
  useEffect(() => {
    load();
  }, [path]);

  return (
    <div className="card">
      <RbacSectionNav />
      <h2>{title}</h2>
      {can(authPerms, "rbac.manage") && (
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            await api.post(path, form);
            toast.success("Saved");
            load();
          }}
        >
          <div className="field">
            <span>User id</span>
            <input required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
          </div>
          <div className="field">
            <span>Permission</span>
            <select required value={form.permissionKey} onChange={(e) => setForm({ ...form, permissionKey: e.target.value })}>
              <option value="">Select</option>
              {perms.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key}
                </option>
              ))}
            </select>
          </div>
          {override && (
            <div className="field">
              <span>Effect</span>
              <select value={form.effect} onChange={(e) => setForm({ ...form, effect: e.target.value })}>
                <option value="allow">allow</option>
                <option value="deny">deny (wins)</option>
              </select>
            </div>
          )}
          {(extraFields || override) && (
            <>
              <div className="field">
                <span>From</span>
                <input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </div>
              <div className="field">
                <span>Till</span>
                <input type="datetime-local" value={form.validTill} onChange={(e) => setForm({ ...form, validTill: e.target.value })} />
              </div>
            </>
          )}
          <div className="field">
            <span>Reason</span>
            <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn">Save</button>
          </div>
        </form>
      )}
      <StateBlock empty={!rows.length} emptyText="No records found">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Permission</th>
                <th>Window / effect</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="font-bold text-slate-900">{r.userId?.email || r.userId}</td>
                  <td>
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {r.permissionId?.key}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-slate-600">
                      {r.effect || "grant"} {r.validFrom} → {r.validTill}
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
