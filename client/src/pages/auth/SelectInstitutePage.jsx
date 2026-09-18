import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { toast } from "../../lib/toast.js";
import { setSession } from "../../store/authSlice";
import { Icon, icons, AcadexLogo } from "../../components/Icons";
import { APP_NAME } from "../../constants/app.js";

export function SelectInstitutePage() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { user, memberships } = useSelector((s) => s.auth);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      api
        .get("/institutes")
        .then(({ data }) => setInstitutes(data.data || []))
        .catch((e) => toast.error(e.apiMessage));
    }
  }, [user]);

  async function choose(instituteId, membershipId) {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/select-institute", { instituteId, membershipId });
      dispatch(
        setSession({
          token: data.data.token,
          institute: data.data.institute,
          membership: data.data.membership || null,
          roles: data.data.roles || [],
          effectivePermissions: data.data.effectivePermissions || []
        })
      );
      const me = await api.get("/auth/me");
      dispatch(
        setSession({
          user: me.data.data.user,
          institute: me.data.data.institute,
          membership: me.data.data.membership,
          roles: me.data.data.roles,
          effectivePermissions: me.data.data.effectivePermissions,
          memberships: me.data.data.memberships,
          displayInstituteId: me.data.data.displayInstituteId,
          displayInstituteIdKind: me.data.data.displayInstituteIdKind
        })
      );
      nav("/");
    } catch (e) {
      toast.error(e.apiMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fe] px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <AcadexLogo size={30} />
          <span className="text-2xl font-black tracking-tight text-slate-900">{APP_NAME}</span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Workspace Selection</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Select Campus / Institute</h1>
        </div>
        {user?.isSuperAdmin && (
          <section className="card space-y-4">
            <h2 className="text-lg font-bold text-slate-900">All Campuses (Super Admin)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {institutes.map((i) => (
                <button
                  key={i._id}
                  disabled={loading}
                  onClick={() => choose(i._id)}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <p className="font-bold text-slate-900">{i.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{i.code}</p>
                </button>
              ))}
            </div>
            <CreateInstitute onDone={() => api.get("/institutes").then(({ data }) => setInstitutes(data.data || []))} />
          </section>
        )}
        <section className="card space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Your Campus Memberships</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(memberships || []).map((m) => (
              <button
                key={m.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-blue-300"
                disabled={loading}
                onClick={() => choose(m.institute?._id, m.id)}
              >
                <p className="font-bold text-slate-900">{m.institute?.name}</p>
                <p className="text-xs text-slate-400">Active Member</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CreateInstitute({ onDone }) {
  const [form, setForm] = useState({ name: "", code: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("code", form.code);
      await api.post("/institutes", fd);
      setForm({ name: "", code: "" });
      toast.success("Institute created.");
      onDone();
    } catch (err) {
      toast.error(err.apiMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border-t border-slate-100 pt-5">
      <div className="grid items-end gap-3 sm:grid-cols-3">
        <div className="field !mb-0">
          <span>Campus Name</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field !mb-0">
          <span>Campus Code</span>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <button className="btn !py-2.5 font-semibold" disabled={loading}>
          Create Institute
        </button>
      </div>
    </form>
  );
}
