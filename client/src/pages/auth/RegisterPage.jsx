import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { toast } from "../../lib/toast.js";
import { AcadexLogo } from "../../components/Icons";
import { APP_NAME } from "../../constants/app.js";
import { AuthLayout } from "../../layouts/AuthLayout";

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", gender: "", dateOfBirth: "" });
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      if (avatar) fd.append("avatar", avatar);
      await api.post("/auth/register", fd);
      toast.success("Registered successfully. Redirecting to login…");
      setTimeout(() => nav("/login"), 1000);
    } catch (err) {
      setError(err.apiMessage);
      toast.error(err.apiMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-5 flex items-center gap-2.5">
          <AcadexLogo size={28} />
          <span className="text-xl font-black tracking-tight text-slate-900">Acadex</span>
        </div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600">Registration</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Create your account</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div className="field">
            <span>Full Name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <span>Email</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <span>Password</span>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn w-full !py-3 font-semibold" disabled={loading}>
            {loading ? "Creating Profile…" : "Register Account"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{" "}
          <Link className="font-bold text-blue-600" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
