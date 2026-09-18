export function Icon({ d, size = 18, className = "", style, ...props }) {
  if (typeof d === "function") {
    const Comp = d;
    return <Comp className={className} style={{ width: size, height: size, ...style }} {...props} />;
  }

  const dim = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      width={typeof size === "number" ? size : 18}
      height={typeof size === "number" ? size : 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 inline-block align-middle ${className}`}
      style={{
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        maxWidth: dim,
        maxHeight: dim,
        ...style
      }}
      aria-hidden
      {...props}
    >
      <path d={d} />
    </svg>
  );
}

// Acadex layered rhombuses logo mark
export function AcadexLogo({ size = 26, className = "", style }) {
  const dim = typeof size === "number" ? `${size}px` : size;
  return (
    <svg
      width={typeof size === "number" ? size : 26}
      height={typeof size === "number" ? size : 26}
      viewBox="0 0 36 36"
      fill="none"
      className={`shrink-0 brand-logo ${className}`}
      style={{
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        maxWidth: dim,
        maxHeight: dim,
        ...style
      }}
    >
      {/* Top Layer */}
      <path
        d="M18 4L4 11.5L18 19L32 11.5L18 4Z"
        fill="#2563EB"
      />
      {/* Middle Layer */}
      <path
        d="M4 17.5L18 25L32 17.5"
        stroke="#3B82F6"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom Layer */}
      <path
        d="M4 23.5L18 31L32 23.5"
        stroke="#1D4ED8"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const icons = {
  // Acadex sidebar navigation
  dashboard: "M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z",
  student: "M12 2L1 8l11 6 9-4.91V17h2V8L12 2zM5 12.5v4.2L12 21l7-4.3v-4.2L12 16.5l-7-4z",
  teacher: "M19 4H5a2 2 0 00-2 2v9a2 2 0 002 2h4v3l3-2 3 2v-3h4a2 2 0 002-2V6a2 2 0 00-2-2zm-7 3a2 2 0 110 4 2 2 0 010-4zm4 8H8v-.5a2.5 2.5 0 015 0v.5z",
  department: "M3 21h18M3 9h18M4 9v12M20 9v12M9 21V9M15 21V9M7 5h10a2 2 0 012 2v2H5V7a2 2 0 012-2z",
  class: "M2 5a2 2 0 012-2h16a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm6 15h8m-4-2v4",
  event: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm3 9h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01",
  timetable: "M3 4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6h18M3 14h18M8 3v18M14 3v18",
  library: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13H6.5A2.5 2.5 0 004 19.5zM6 4v13",
  account: "M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  help: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-7v.01M12 12a2 2 0 10-1.73-3",

  // Top header icons
  search: "M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z",
  message: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0",

  // Action icons
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 18l6-6-6-6",
  dotsHorizontal: "M5 12h.01M12 12h.01M19 12h.01",
  trophy: "M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2m12 6h2a2 2 0 002-2V5a2 2 0 00-2-2h-2M6 3h12v7a6 6 0 01-12 0V3zm6 13v5m-4 0h8",
  awardRibbon: "M12 15a5 5 0 100-10 5 5 0 000 10zm-3 4l3-2 3 2v-4.5H9V19z",
  check: "M20 6L9 17l-5-5",
  plus: "M12 5v14M5 12h14",
  filter: "M3 4h18l-7 8v6l-4 2v-8L3 4z",
  menu: "M4 6h16M4 12h16M4 18h16",
  logout: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3",

  // Retained functional icons
  building: "M4 21V5a2 2 0 012-2h6v18M10 9h.01M10 13h.01M10 17h.01M16 21V8h4v13",
  shield: "M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z",
  users: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M8 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13H6.5A2.5 2.5 0 004 19.5z",
  calendar: "M8 7V3M16 7V3M4 11h16M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  wallet: "M21 12V7H5a2 2 0 00-2 2v9a2 2 0 002 2h16v-5M21 12h-6a2 2 0 000 4h6v-4z",
  bus: "M4 16V6a2 2 0 012-2h12a2 2 0 012 2v10M4 16h16M6 19a1 1 0 100-2 1 1 0 000 2M18 19a1 1 0 100-2 1 1 0 000 2",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  home: "M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
};
