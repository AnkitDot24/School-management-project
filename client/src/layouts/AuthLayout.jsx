import { Link } from "react-router-dom";

export function AuthLayout({ children, showBack = true }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f4f7fe] p-4 font-sans sm:p-8">
      {showBack && (
        <div className="absolute left-6 top-6 sm:left-8 sm:top-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-800"
          >
            ← Back to sign in
          </Link>
        </div>
      )}
      <div className="w-full max-w-[460px]">{children}</div>
    </div>
  );
}
