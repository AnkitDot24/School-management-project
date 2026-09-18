/** Mirrors server ROLE_DEFAULTS names and membership ID prefixes (server/src/services/instituteIds.js). */
export const ROLE_ID_PREFIX = {
  INSTITUTE_ADMIN: "ADM",
  PRINCIPAL: "PRN",
  TEACHER: "TCH",
  ACCOUNTANT: "ACC",
  CFO: "CFO",
  HR_MANAGER: "HRM",
  LIBRARIAN: "LIB",
  HOSTEL_WARDEN: "HST",
  TRANSPORT_ADMIN: "TRN",
  EMPLOYEE: "EMP",
  STUDENT: "STU",
  PARENT: "PAR"
};

export const ROLE_LABELS = {
  INSTITUTE_ADMIN: "Institute Admin",
  PRINCIPAL: "Principal",
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  CFO: "CFO",
  HR_MANAGER: "HR Manager",
  LIBRARIAN: "Librarian",
  HOSTEL_WARDEN: "Hostel Warden",
  TRANSPORT_ADMIN: "Transport Admin",
  EMPLOYEE: "Employee",
  STUDENT: "Student",
  PARENT: "Parent",
  SUPER_ADMIN: "Super Admin"
};

export function roleLabel(code) {
  if (!code) return "";
  return ROLE_LABELS[code] || code.replace(/_/g, " ");
}
