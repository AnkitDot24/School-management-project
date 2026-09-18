import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/client";
import { logout, can } from "../store/authSlice";
import { toggleSidebar } from "../store/uiSlice";
import { Icon, icons, AcadexLogo } from "../components/Icons";
import { APP_NAME } from "../constants/app.js";
import { InstituteIdBadge } from "../components/InstituteIdBadge.jsx";
import { roleLabel } from "../constants/instituteRoles.js";

const MAIN_NAV = [
  { to: "/", label: "Dashboard", icon: icons.dashboard, end: true },
  { to: "/students", label: "Students", icon: icons.student, perm: "student.read" },
  { to: "/employees", label: "Teachers & Staff", icon: icons.teacher, perm: "employee.read" },
  { to: "/academic", label: "Academic setup", icon: icons.class, perm: "academic.read", end: true },
  { to: "/attendance", label: "Attendance", icon: icons.event, perm: "attendance.read" },
  { to: "/assignments", label: "Time table", icon: icons.timetable, perm: "assignment.read" },
  { to: "/library", label: "Library", icon: icons.library, perm: "library.read" }
];

const ACCESS_NAV = [
  { to: "/roles", label: "Roles & permissions", icon: icons.shield, perm: "rbac.read", end: true },
  { to: "/memberships", label: "Memberships", icon: icons.users, perm: "rbac.read" },
  { to: "/grants", label: "Temporary grants", icon: icons.shield, perm: "rbac.read" },
  { to: "/overrides", label: "Permission overrides", icon: icons.shield, perm: "rbac.read" },
  { to: "/audit", label: "Audit logs", icon: icons.clipboard, perm: "audit.read" },
  { to: "/institute", label: "Institute settings", icon: icons.building, perm: "institute.read" }
];

const MORE_MODULES = [
  { to: "/fees", label: "Fees & Finance", icon: icons.wallet, any: ["fees.read", "fees.reports", "fees.collect"] },
  { to: "/exams", label: "Exams & Results", icon: icons.book, perm: "exam.read" },
  { to: "/hostel", label: "Hostel", icon: icons.home, perm: "hostel.read" },
  { to: "/transport", label: "Transport", icon: icons.bus, perm: "transport.read" },
  { to: "/portal/student", label: "Student Portal", icon: icons.dashboard, perm: "portal.self" },
  { to: "/portal/parent", label: "Parent Portal", icon: icons.users, perm: "portal.child" },
  { to: "/institutes", label: "Institutes List", icon: icons.building, super: true }
];

export function DashboardLayout({ children }) {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { user, institute, membership, effectivePermissions, roles, displayInstituteId, displayInstituteIdKind } =
    useSelector((s) => s.auth);
  const sidebarId = displayInstituteId || membership?.displayInstituteId || membership?.memberCode;
  const sidebarIdKind = displayInstituteIdKind || membership?.displayInstituteIdKind || "default";
  const open = useSelector((s) => s.ui.sidebarOpen);

  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  const allowed = (l) => {
    if (l.super) return user?.isSuperAdmin;
    if (l.perm) return can(effectivePermissions, l.perm) || user?.isSuperAdmin;
    if (l.any) return l.any.some((k) => can(effectivePermissions, k)) || user?.isSuperAdmin;
    return true;
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    dispatch(logout());
    nav("/login");
  };

  const quickNav = [
    { title: "Dashboard", to: "/" },
    { title: "Students Directory", to: "/students" },
    { title: "Staff & Teachers", to: "/employees" },
    { title: "Fees Collection", to: "/fees/collect" },
    { title: "Fee Dues & Reports", to: "/fees/dues" },
    { title: "Academic Setup", to: "/academic" },
    { title: "Attendance Punch-in", to: "/attendance" },
    { title: "Library Catalog", to: "/library" },
    { title: "Exams Management", to: "/exams" },
    { title: "Transport Routes", to: "/transport" },
    { title: "Roles & Permissions", to: "/roles" },
    { title: "Memberships", to: "/memberships" },
    { title: "Temporary Grants", to: "/grants" },
    { title: "Permission Overrides", to: "/overrides" },
    { title: "Audit Logs", to: "/audit" },
    { title: "Institute Settings", to: "/institute" }
  ].filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="app">
      <div className={`overlay ${open ? "show" : ""}`} onClick={() => dispatch(toggleSidebar(false))} />

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <AcadexLogo size={26} />
          <span className="text-lg font-black tracking-tight text-slate-900">{APP_NAME}</span>
        </div>

        <div className="relative">
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            className="user-profile-badge cursor-pointer select-none"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "MA"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold leading-tight text-slate-900">{user?.name || "User"}</p>
                <p className="truncate text-[11px] font-medium text-slate-400">
                  {roles?.[0] ? roleLabel(roles[0]) : user?.isSuperAdmin ? "Super Admin" : "Admin"}
                </p>
                {sidebarId ? (
                  <div className="mt-0.5 scale-[0.92] origin-left">
                    <InstituteIdBadge value={sidebarId} kind={sidebarIdKind} />
                  </div>
                ) : null}
              </div>
            </div>
            <Icon
              d={icons.chevronDown}
              size={14}
              className={`text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
            />
          </div>

          {profileOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mb-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
              <div className="mb-1 border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  nav("/select-institute");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Icon d={icons.building} size={14} className="text-slate-400" />
                Switch Institute
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                <Icon d={icons.logout} size={14} className="text-rose-500" />
                Logout
              </button>
            </div>
          )}
        </div>

        <nav className="nav flex-1 space-y-0.5">
          {MAIN_NAV.filter(allowed).map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.end}
              onClick={() => dispatch(toggleSidebar(false))}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? "!bg-blue-50/80 !font-bold !text-blue-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    d={item.icon}
                    size={18}
                    className={`transition ${isActive ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {ACCESS_NAV.some(allowed) && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setAccessOpen(!accessOpen)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <span>Access &amp; audit</span>
                <Icon
                  d={icons.chevronDown}
                  size={12}
                  className={`transition-transform ${accessOpen ? "rotate-180" : ""}`}
                />
              </button>
              {accessOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-violet-100 pl-2">
                  {ACCESS_NAV.filter(allowed).map((m) => (
                    <NavLink
                      key={m.to}
                      to={m.to}
                      end={m.end}
                      onClick={() => dispatch(toggleSidebar(false))}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                          isActive ? "bg-violet-50 font-bold text-violet-700" : "text-slate-500 hover:text-slate-900"
                        }`
                      }
                    >
                      <Icon d={m.icon} size={15} />
                      <span className="truncate">{m.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <span>More Modules</span>
              <Icon d={icons.chevronDown} size={12} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-blue-100 pl-2">
                {MORE_MODULES.filter(allowed).map((m) => (
                  <NavLink
                    key={m.to}
                    to={m.to}
                    onClick={() => dispatch(toggleSidebar(false))}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                        isActive ? "bg-blue-50 font-bold text-blue-600" : "text-slate-500 hover:text-slate-900"
                      }`
                    }
                  >
                    <Icon d={m.icon} size={15} />
                    <span className="truncate">{m.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="mt-auto space-y-0.5 border-t border-slate-100 pt-3">
          <NavLink
            to="/profile"
            onClick={() => dispatch(toggleSidebar(false))}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon d={icons.account} size={18} className="text-slate-400" />
            <span>Account</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon d={icons.help} size={18} className="text-slate-400" />
            <span>Help</span>
          </button>
        </div>
      </aside>

      <div className="main flex min-h-screen flex-col">
        <div className="topbar">
          <div className="flex items-center gap-2.5">
            <button className="btn ghost menu-btn !px-2 !py-1.5" onClick={() => dispatch(toggleSidebar())}>
              <Icon d={icons.menu} size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden h-2 w-2 rounded-full bg-emerald-500 sm:inline-block" />
              <span className="max-w-[200px] truncate text-xs font-semibold text-slate-500 sm:max-w-xs">
                {institute?.name || "Platform Campus"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-slate-800"
            >
              <Icon d={icons.search} size={16} />
            </button>
            <button
              type="button"
              className="btn ghost !hidden !px-3 !py-1.5 text-xs font-semibold text-slate-700 sm:!inline-flex"
              onClick={() => nav("/select-institute")}
            >
              Switch Campus
            </button>
            <button type="button" className="btn secondary !px-3 !py-1.5 text-xs font-semibold !text-blue-700" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1">{children}</div>
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <Icon d={icons.search} className="h-5 w-5 text-slate-400" />
              <input
                autoFocus
                placeholder="Search modules, pages, actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
              {quickNav.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    nav(item.to);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>{item.title}</span>
                  <span className="text-xs text-slate-400">Go →</span>
                </button>
              ))}
              {!quickNav.length && <p className="p-4 text-center text-xs text-slate-400">No matching module found</p>}
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AcadexLogo className="h-6 w-6" />
                <h3 className="m-0 text-base font-bold text-slate-900">{APP_NAME} Help</h3>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-600">Use the sidebar for modules, or search from the top bar to jump quickly.</p>
            <div className="mt-5 text-right">
              <button type="button" className="btn secondary !px-4 !py-2 text-xs" onClick={() => setHelpOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
