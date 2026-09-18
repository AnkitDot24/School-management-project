import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/client";
import { toast } from "../lib/toast.js";
import { setSession } from "../store/authSlice";
import { InstituteIdBadge } from "../components/InstituteIdBadge.jsx";
import { roleLabel } from "../constants/instituteRoles.js";

export default function Profile() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const institute = useSelector((s) => s.auth.institute);
  const roles = useSelector((s) => s.auth.roles);
  const memberships = useSelector((s) => s.auth.memberships);
  const membership = useSelector((s) => s.auth.membership);
  const displayInstituteId = useSelector((s) => s.auth.displayInstituteId);
  const displayInstituteIdKind = useSelector((s) => s.auth.displayInstituteIdKind);

  const [form, setForm] = useState({ name: "", phone: "", gender: "", dateOfBirth: "" });
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        gender: user.gender || "",
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : ""
      });
    }
  }, [user]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatar) fd.append("avatar", avatar);
      const { data } = await api.patch("/auth/profile", fd);
      dispatch(setSession({ user: data.data }));
      setAvatar(null);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.apiMessage);
    }
  }

  if (!user) return <div className="empty">Loading…</div>;

  return (
    <div className="grid">
      <div className="card">
        <div className="mb-4 flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-sm">
              {(user.name || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h2 className="!mb-0">{user.name}</h2>
            <p className="!mb-0 mt-1 text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
          <div className="field">
            <span>Full name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <span>Phone</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="field">
            <span>Gender</span>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="field">
            <span>Date of birth</span>
            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div className="field">
            <span>Profile photo</span>
            <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} />
          </div>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn">Save changes</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Role &amp; institute access</h2>
        <p>
          Roles are scoped per institute — switch institutes to act under a different role. Only permissions attached
          to a role take effect (see Roles page).
        </p>
        <div className="mb-4">
          <p className="!mb-1 text-sm font-semibold text-slate-700">Current institute</p>
          {institute ? (
            <>
              <p className="!mb-1">{institute.name}</p>
              {(displayInstituteId || membership?.displayInstituteId || membership?.memberCode) ? (
                <p className="!mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>Your institute ID</span>
                  <InstituteIdBadge
                    value={displayInstituteId || membership?.displayInstituteId || membership?.memberCode}
                    kind={displayInstituteIdKind || membership?.displayInstituteIdKind || "default"}
                  />
                  {roles[0] ? (
                    <span className="text-xs font-medium text-slate-500">{roleLabel(roles[0])}</span>
                  ) : null}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {(roles.length ? roles : ["No role assigned"]).map((r) => (
                  <span key={r} className="chip">
                    {r === "No role assigned" ? r : roleLabel(r)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="!mb-0 text-sm text-slate-500">{user.isSuperAdmin ? "Platform Super Admin" : "No institute selected"}</p>
          )}
        </div>

        <p className="!mb-1 text-sm font-semibold text-slate-700">All memberships</p>
        {memberships?.length ? (
          <table>
            <thead>
              <tr>
                <th>Institute</th>
                <th>Institute ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.id}>
                  <td>{m.institute?.name}</td>
                  <td>
                    <InstituteIdBadge
                      value={m.displayInstituteId || m.memberCode}
                      kind={m.displayInstituteIdKind || "default"}
                    />
                  </td>
                  <td>{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="!mb-0 text-sm text-slate-500">No institute memberships yet.</p>
        )}
      </div>
    </div>
  );
}
