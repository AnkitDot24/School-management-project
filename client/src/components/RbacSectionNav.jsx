import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { can } from "../store/authSlice";

const TABS = [
  { to: "/roles", label: "Roles", perm: "rbac.read" },
  { to: "/memberships", label: "Memberships", perm: "rbac.read" },
  { to: "/grants", label: "Temporary grants", perm: "rbac.read" },
  { to: "/overrides", label: "Overrides", perm: "rbac.read" },
  { to: "/audit", label: "Audit logs", perm: "audit.read" },
  { to: "/institute", label: "Institute", perm: "institute.read" }
];

export function RbacSectionNav() {
  const { effectivePermissions, user } = useSelector((s) => s.auth);
  const superAdmin = user?.isSuperAdmin;

  const visible = TABS.filter(
    (t) => superAdmin || (t.perm ? can(effectivePermissions, t.perm) : true)
  );
  if (visible.length < 2) return null;

  return (
    <nav className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
      {visible.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to !== "/roles"}
          className={({ isActive }) =>
            `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
