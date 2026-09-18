import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { can } from "../../store/authSlice";

export default function PermissionGate({ permission, any, children, fallback = null }) {
  const perms = useSelector((s) => s.auth.effectivePermissions);
  if (permission && !can(perms, permission)) return fallback;
  if (any && !any.some((k) => can(perms, k))) return fallback;
  return children;
}

export function RequireAuth({ children }) {
  const token = useSelector((s) => s.auth.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
