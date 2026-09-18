import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../../api/client";
import { toast } from "../../lib/toast.js";
import { setSession } from "../../store/authSlice";
import { AcadexLogo } from "../../components/Icons";
import { APP_NAME } from "../../constants/app.js";

export function LoginPage() {
  const [email, setEmail] = useState("admin@platform.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      dispatch(
        setSession({
          token: data.data.token,
          user: data.data.user,
          memberships: data.data.memberships,
          status: "succeeded"
        })
      );
      nav("/select-institute");
    } catch (err) {
      toast.error(err.apiMessage);
    } finally {
      setLoading(false);
    }
  }

  const fillDemo = (e, p) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="grid min-h-screen bg-[#f4f7fe] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-xl font-black">
            <AcadexLogo size={32} />
            Acadex
          </div>
          <h2 className="mt-16 max-w-md text-4xl font-extrabold leading-tight tracking-tight">
            Streamline your campus, faculties, and students in one place.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            From enrollment and academic schedules to automated fees, attendance, and exam management — scoped with enterprise role-based security.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span>{APP_NAME} Campus Platform</span>
          <span>•</span>
          <span>MERN Architecture</span>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <AcadexLogo className="h-7 w-7" />
            <span className="text-lg font-black text-slate-900">{APP_NAME}</span>
          </div>

          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600">Welcome back</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Sign in to {APP_NAME}</h1>
          <p className="mb-6 mt-1 text-xs text-slate-400">Sign in with your campus account.</p>

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="field">
              <span>Email Address</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div className="field">
              <span>Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            <button className="btn mt-2 w-full !py-3 text-sm font-semibold" disabled={loading}>
              {loading ? "Authenticating…" : "Sign In to Campus"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Demo Logins:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillDemo("rajeshkumardpsadmin@gmail.com", "Test@123456")}
                className="rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                DPS Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin@platform.com", "Admin@123")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Platform Admin
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Need an account?{" "}
            <Link className="font-bold text-blue-600 hover:text-blue-700" to="/register">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
