import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { toast } from "../lib/toast.js";
import { Spinner } from "../components/Loading.jsx";
import { can } from "../store/authSlice";
import { Icon, icons } from "../components/Icons";

export default function Dashboard() {
  const nav = useNavigate();
  const perms = useSelector((s) => s.auth.effectivePermissions);
  const { user, institute, roles } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter dropdown states
  const [academicFilter, setAcademicFilter] = useState("Last 4 Year");
  const [academicDropdownOpen, setAcademicDropdownOpen] = useState(false);
  const [earningsFilter, setEarningsFilter] = useState("Last Semester");
  const [earningsDropdownOpen, setEarningsDropdownOpen] = useState(false);

  // Active chart tooltip states
  const [activePoint, setActivePoint] = useState(4); // default highlighted 2026 Even (index 4)
  const [activeMonth, setActiveMonth] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const jobs = [];
    if (can(perms, "dashboard.read")) {
      jobs.push(api.get("/dashboard").then(({ data }) => ({ stats: data.data })));
    }
    if (can(perms, "fees.read") || can(perms, "fees.reports")) {
      jobs.push(api.get("/fees/dashboard").then(({ data }) => ({ fees: data.data })));
    }
    if (!jobs.length) {
      setLoading(false);
      return;
    }
    Promise.all(jobs)
      .then((results) => {
        if (cancelled) return;
        for (const r of results) {
          if (r.stats) setStats(r.stats);
          if (r.fees) setFees(r.fees);
        }
      })
      .catch((e) => toast.error(e.apiMessage || "Could not load dashboard"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [perms]);

  // Formatted date subtitle matching screenshot (e.g. "June 28, Wednesday")
  const dateFormatted = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());

  // Top metric stat values
  const studentCount = stats?.students ? Number(stats.students).toLocaleString() : "5,699";
  const lecturerCount = stats?.employees ? Number(stats.employees).toLocaleString() : "297";
  const awardsCount = "368";
  const revenueVal = fees?.paid
    ? `$${Number(fees.paid).toLocaleString()}`
    : "$87,395";

  // Academic Performance data points (8 semesters across 4 years)
  const academicData = [
    { year: "2024", sem: "Even", val: 32, label: "2024 Even" },
    { year: "2024", sem: "Odd", val: 42, label: "2024 Odd" },
    { year: "2025", sem: "Even", val: 38, label: "2025 Even" },
    { year: "2025", sem: "Odd", val: 45, label: "2025 Odd" },
    { year: "2026", sem: "Even", val: 70, label: "2026 Even" }, // Highlighted 70%
    { year: "2026", sem: "Odd", val: 62, label: "2026 Odd" },
    { year: "2027", sem: "Even", val: 66, label: "2027 Even" },
    { year: "2027", sem: "Odd", val: 58, label: "2027 Odd" }
  ];

  // SVG dimensions for Academic Performance Line Chart
  const svgWidth = 560;
  const svgHeight = 180;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 26;
  const padBottom = 24;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const points = academicData.map((d, i) => {
    const x = padLeft + (i / (academicData.length - 1)) * chartW;
    const y = padTop + chartH - (d.val / 100) * chartH;
    return { ...d, x, y, index: i };
  });

  // Smooth bezier curve path
  const curvePath = points.reduce((acc, curr, i, arr) => {
    if (i === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[i - 1];
    const cpx1 = prev.x + (curr.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (curr.x - prev.x) / 2;
    const cpy2 = curr.y;
    return `${acc} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
  }, "");

  // Area fill under curve
  const areaPath = `${curvePath} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  // Earnings Bar Chart data (Jan - Jun)
  const earningsData = [
    { month: "Jan", expenses: 52, earnings: 90 },
    { month: "Feb", expenses: 37, earnings: 65 },
    { month: "Mar", expenses: 42, earnings: 78 },
    { month: "Apr", expenses: 50, earnings: 68 },
    { month: "May", expenses: 43, earnings: 80 },
    { month: "Jun", expenses: 61, earnings: 94 }
  ];

  const maxEarningsVal = 100; // 100K scale

  return (
    <div className="space-y-5 pb-10">
      {/* Top Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{dateFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nav("/students")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200/80 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-slate-800 transition"
            title="Search"
          >
            <Icon d={icons.search} size={16} />
          </button>
          <button
            type="button"
            onClick={() => {}}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200/80 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-slate-800 transition"
            title="Notifications"
          >
            <Icon d={icons.message} size={16} />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-medium text-slate-500">
          <Spinner className="h-4 w-4" />
          Loading dashboard metrics…
        </div>
      )}

      {/* Row 1: 4 Metric Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Stat 1: Students */}
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-400">Students</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{studentCount}</h3>
          </div>
          <button
            type="button"
            onClick={() => nav("/students")}
            className="stat-arrow-btn cursor-pointer"
            title="View Students"
          >
            <Icon d={icons.arrowRight} size={16} />
          </button>
        </div>

        {/* Stat 2: Lecturers */}
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-400">Lecturers</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{lecturerCount}</h3>
          </div>
          <button
            type="button"
            onClick={() => nav("/employees")}
            className="stat-arrow-btn cursor-pointer"
            title="View Lecturers"
          >
            <Icon d={icons.arrowRight} size={16} />
          </button>
        </div>

        {/* Stat 3: Awards */}
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-400">Awards</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{awardsCount}</h3>
          </div>
          <button
            type="button"
            onClick={() => {}}
            className="stat-arrow-btn cursor-pointer"
            title="View Awards"
          >
            <Icon d={icons.arrowRight} size={16} />
          </button>
        </div>

        {/* Stat 4: Revenue */}
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-400">Revenue</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{revenueVal}</h3>
          </div>
          <button
            type="button"
            onClick={() => nav("/fees")}
            className="stat-arrow-btn cursor-pointer"
            title="View Revenue"
          >
            <Icon d={icons.arrowRight} size={16} />
          </button>
        </div>
      </div>

      {/* Row 2: Middle Visualizations (Academic Performance & Earnings) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Card 1: Academic Performance */}
        <div className="card lg:col-span-7 flex flex-col justify-between p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">Academic Performance</h2>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAcademicDropdownOpen(!academicDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                <span>{academicFilter}</span>
                <Icon d={icons.chevronDown} size={12} className="text-slate-400" />
              </button>
              {academicDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl border border-slate-100 bg-white p-1 shadow-lg">
                  {["Last 4 Year", "Last 2 Year", "This Year"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setAcademicFilter(opt);
                        setAcademicDropdownOpen(false);
                      }}
                      className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Academic Performance SVG Chart */}
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible"
            >
              <defs>
                <linearGradient id="academicGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[100, 66, 33, 0].map((level) => {
                const yPos = padTop + chartH - (level / 100) * chartH;
                return (
                  <g key={level}>
                    <text
                      x={padLeft - 6}
                      y={yPos + 4}
                      textAnchor="end"
                      className="text-[10px] font-medium fill-slate-400"
                    >
                      {level}%
                    </text>
                    <line
                      x1={padLeft}
                      y1={yPos}
                      x2={padLeft + chartW}
                      y2={yPos}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={level === 0 ? "0" : "4 4"}
                    />
                  </g>
                );
              })}

              {/* Area gradient under curve */}
              <path d={areaPath} fill="url(#academicGradient)" />

              {/* Smooth line */}
              <path
                d={curvePath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Highlighted active point guide line and tooltip */}
              {activePoint !== null && points[activePoint] && (
                <g>
                  {/* Vertical dashed indicator line */}
                  <line
                    x1={points[activePoint].x}
                    y1={points[activePoint].y}
                    x2={points[activePoint].x}
                    y2={padTop + chartH}
                    stroke="#059669"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  {/* Black callout pill */}
                  <g transform={`translate(${points[activePoint].x - 20}, ${points[activePoint].y - 30})`}>
                    <rect
                      width="40"
                      height="22"
                      rx="5"
                      fill="#0f172a"
                      className="shadow-md"
                    />
                    <text
                      x="20"
                      y="15"
                      textAnchor="middle"
                      fill="#ffffff"
                      className="text-[11px] font-bold"
                    >
                      {points[activePoint].val}%
                    </text>
                  </g>
                </g>
              )}

              {/* Interactive Data points */}
              {points.map((pt, idx) => (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => setActivePoint(idx)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#ffffff"
                    stroke="#059669"
                    strokeWidth="2.5"
                    className="transition hover:scale-125"
                  />
                </g>
              ))}
            </svg>

            {/* X-axis labels matching screenshot: Even/Odd top, Year bottom */}
            <div className="mt-1.5 grid grid-cols-8 text-center" style={{ marginLeft: `${(padLeft / svgWidth) * 100}%` }}>
              {academicData.map((d, i) => (
                <div key={i} className="text-[10px]">
                  <p className="font-semibold text-slate-400">{d.sem}</p>
                  {i % 2 === 0 && (
                    <p className="font-bold text-slate-400 mt-0.5 col-span-2 -ml-2 sm:-ml-0">
                      {d.year}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Earnings */}
        <div className="card lg:col-span-5 flex flex-col justify-between p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-slate-900">Earnings</h2>
            <div className="relative">
              <button
                type="button"
                onClick={() => setEarningsDropdownOpen(!earningsDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                <span>{earningsFilter}</span>
                <Icon d={icons.chevronDown} size={12} className="text-slate-400" />
              </button>
              {earningsDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl border border-slate-100 bg-white p-1 shadow-lg">
                  {["Last Semester", "Annual", "This Month"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setEarningsFilter(opt);
                        setEarningsDropdownOpen(false);
                      }}
                      className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-xs font-medium text-slate-500">Earnings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-xs font-medium text-slate-500">Expenses</span>
            </div>
          </div>

          {/* Grouped Bar Chart */}
          <div className="relative flex-1 flex flex-col justify-end pt-2">
            {/* Y-axis intervals and horizontal guide lines */}
            <div className="relative h-36 w-full flex items-end">
              {/* Background horizontal lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[100, 75, 50, 25, 0].map((val) => (
                  <div key={val} className="flex items-center w-full">
                    <span className="w-7 text-right pr-2 text-[10px] font-medium text-slate-400">
                      {val === 0 ? "0" : `${val}K`}
                    </span>
                    <div className="flex-1 border-b border-slate-100" />
                  </div>
                ))}
              </div>

              {/* Bars container */}
              <div className="relative ml-7 flex-1 h-full flex items-end justify-between px-1.5 sm:px-3">
                {earningsData.map((d, i) => {
                  const expHeight = (d.expenses / maxEarningsVal) * 100;
                  const earnHeight = (d.earnings / maxEarningsVal) * 100;
                  const isHovered = activeMonth === i;

                  return (
                    <div
                      key={d.month}
                      className="flex flex-col items-center group cursor-pointer"
                      onMouseEnter={() => setActiveMonth(i)}
                      onMouseLeave={() => setActiveMonth(null)}
                    >
                      {/* Hover Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-7 z-20 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-md pointer-events-none whitespace-nowrap">
                          {d.month}: ${d.earnings}K / ${d.expenses}K
                        </div>
                      )}
                      <div className="flex items-end gap-1 sm:gap-1.5 h-28">
                        {/* Expenses bar (Green) */}
                        <div
                          style={{ height: `${expHeight}%` }}
                          className="w-2.5 sm:w-3.5 rounded-t-sm bg-emerald-600 transition-all duration-300 group-hover:brightness-95"
                        />
                        {/* Earnings bar (Blue) */}
                        <div
                          style={{ height: `${earnHeight}%` }}
                          className="w-2.5 sm:w-3.5 rounded-t-sm bg-blue-600 transition-all duration-300 group-hover:brightness-95"
                        />
                      </div>
                      <span className="mt-1.5 text-[11px] font-semibold text-slate-400">
                        {d.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Bottom Row (Messages, Students Donut Gauge, Student Activity) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Messages */}
        <div className="card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Messages</h2>
              <button
                type="button"
                onClick={() => {}}
                className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
              >
                View All
              </button>
            </div>

            {/* Message Items */}
            <div className="space-y-3">
              {/* Message 1 */}
              <div className="flex items-start gap-2.5 transition hover:bg-slate-50/80 p-1.5 rounded-xl cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  SG
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">Susan Grey</p>
                    <span className="text-[10px] font-medium text-slate-400">2:00 PM</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    Reminder: Department meeting this Wednesday at 3 PM in the main conference room.
                  </p>
                </div>
              </div>

              {/* Message 2 */}
              <div className="flex items-start gap-2.5 transition hover:bg-slate-50/80 p-1.5 rounded-xl cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  JK
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">Jordan Kim</p>
                    <span className="text-[10px] font-medium text-slate-400">11:15 AM</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    Hello, I'm having trouble accessing the online library resources. Could you please check?
                  </p>
                </div>
              </div>

              {/* Message 3 */}
              <div className="flex items-start gap-2.5 transition hover:bg-slate-50/80 p-1.5 rounded-xl cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  AR
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">Alex Rivera</p>
                    <span className="text-[10px] font-medium text-slate-400">Yesterday</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    Quarterly fee structures and concessions have been updated for Class 10 sections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Students Donut / Gauge Chart */}
        <div className="card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900">Students</h2>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Options"
              >
                <Icon d={icons.dotsHorizontal} size={16} />
              </button>
            </div>

            {/* Circular Donut Gauge Graphic */}
            <div className="relative flex items-center justify-center my-3">
              <svg viewBox="0 0 160 160" className="w-36 h-36 -rotate-90">
                {/* Background track circle */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                />
                {/* Green segment arc */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="12"
                  strokeDasharray="180 390"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
                {/* Blue segment arc */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="12"
                  strokeDasharray="150 390"
                  strokeDashoffset="-190"
                  strokeLinecap="round"
                />
              </svg>

              {/* Center Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 tracking-tight">5,100</span>
                <span className="text-[11px] font-semibold text-slate-400">Total Students</span>
              </div>
            </div>

            {/* Sub-breakdown legend */}
            <div className="mt-1 flex items-center justify-center gap-5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="font-semibold text-slate-600 text-xs">Male: 54%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span className="font-semibold text-slate-600 text-xs">Female: 46%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Student Activity */}
        <div className="card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Student Activity</h2>
              <button
                type="button"
                onClick={() => {}}
                className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
              >
                View All
              </button>
            </div>

            {/* Activity Items Feed */}
            <div className="space-y-3">
              {/* Activity 1 */}
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Icon d={icons.trophy} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">Annual Math Olympiad</p>
                    <span className="text-[10px] font-medium text-slate-400">2 days</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                    <Icon d={icons.awardRibbon} size={12} />
                    <span>Gold Medalist</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                    Team Quantum - won the gold medal at the Annual Math Olympiad
                  </p>
                </div>
              </div>

              {/* Activity 2 */}
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Icon d={icons.class} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">Engineering Project Showcase</p>
                    <span className="text-[10px] font-medium text-slate-400">3 days</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                    <Icon d={icons.awardRibbon} size={12} />
                    <span>Best Innovation Award</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                    Robotics club demonstrated automated campus navigation robot
                  </p>
                </div>
              </div>

              {/* Activity 3 */}
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Icon d={icons.student} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">State Science Fair</p>
                    <span className="text-[10px] font-medium text-slate-400">5 days</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                    <Icon d={icons.awardRibbon} size={12} />
                    <span>1st Runner Up</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                    Clean energy water purification project received state honors
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
