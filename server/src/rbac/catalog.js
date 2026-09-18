export const PERMISSIONS = [
  ["institute.read", "institute", "View institute"],
  ["institute.update", "institute", "Update institute"],
  ["rbac.read", "rbac", "View roles and memberships"],
  ["rbac.manage", "rbac", "Manage roles, grants, overrides"],
  ["membership.manage", "rbac", "Manage memberships"],
  ["employee.read", "hr", "View employees"],
  ["employee.write", "hr", "Manage employees"],
  ["employee.softDelete", "hr", "Soft-delete employees"],
  ["employee.restore", "hr", "Restore employees"],
  ["hr.leave", "hr", "Manage leave"],
  ["hr.staffAttendance", "hr", "Staff attendance"],
  ["academic.read", "academic", "View academic setup"],
  ["academic.write", "academic", "Manage academic setup"],
  ["assignment.read", "academic", "View teacher assignments"],
  ["assignment.write", "academic", "Manage teacher assignments"],
  ["student.read", "student", "View students"],
  ["student.write", "student", "Manage students"],
  ["student.softDelete", "student", "Soft-delete students"],
  ["student.restore", "student", "Restore students"],
  ["attendance.read", "attendance", "View student attendance"],
  ["attendance.punch", "attendance", "Punch in/out"],
  ["fees.read", "fees", "View fees"],
  ["fees.assign", "fees", "Assign fees"],
  ["fees.collect", "fees", "Collect payments"],
  ["fees.reports", "fees", "Fee reports"],
  ["fees.structure", "fees", "Manage fee structures and components"],
  ["fees.refund", "fees", "Process fee refunds"],
  ["exam.read", "exam", "View exams"],
  ["exam.write", "exam", "Manage exams and marks"],
  ["library.read", "library", "View library"],
  ["library.write", "library", "Manage library and circulation"],
  ["hostel.read", "hostel", "View hostel"],
  ["hostel.write", "hostel", "Manage hostel"],
  ["transport.read", "transport", "View transport"],
  ["transport.write", "transport", "Manage transport"],
  ["audit.read", "audit", "View audit logs"],
  ["portal.self", "portal", "Student self-service"],
  ["portal.child", "portal", "Parent child data"],
  ["dashboard.read", "dashboard", "View dashboard"]
];

export const ROLE_DEFAULTS = {
  INSTITUTE_ADMIN: {
    name: "Institute Admin",
    keys: PERMISSIONS.map((p) => p[0]).filter((k) => !["portal.self", "portal.child"].includes(k))
  },
  PRINCIPAL: {
    name: "Principal",
    keys: [
      "institute.read",
      "rbac.read",
      "employee.read",
      "academic.read",
      "academic.write",
      "assignment.read",
      "assignment.write",
      "student.read",
      "attendance.read",
      "exam.read",
      "exam.write",
      "fees.read",
      "fees.reports",
      "audit.read",
      "dashboard.read"
    ]
  },
  TEACHER: {
    name: "Teacher",
    keys: [
      "academic.read",
      "assignment.read",
      "student.read",
      "attendance.read",
      "attendance.punch",
      "exam.read",
      "exam.write",
      "dashboard.read"
    ]
  },
  ACCOUNTANT: {
    name: "Accountant",
    keys: [
      "student.read",
      "fees.read",
      "fees.structure",
      "fees.assign",
      "fees.collect",
      "fees.refund",
      "fees.reports",
      "dashboard.read"
    ]
  },
  CFO: {
    name: "CFO",
    keys: ["fees.read", "fees.reports", "dashboard.read", "audit.read"]
  },
  HR_MANAGER: {
    name: "HR Manager",
    keys: ["employee.read", "employee.write", "employee.softDelete", "employee.restore", "hr.leave", "hr.staffAttendance", "dashboard.read"]
  },
  LIBRARIAN: {
    name: "Librarian",
    keys: ["library.read", "library.write", "student.read", "dashboard.read"]
  },
  HOSTEL_WARDEN: {
    name: "Hostel Warden",
    keys: ["hostel.read", "hostel.write", "student.read", "dashboard.read"]
  },
  TRANSPORT_ADMIN: {
    name: "Transport Admin",
    keys: ["transport.read", "transport.write", "student.read", "dashboard.read"]
  },
  EMPLOYEE: {
    name: "Employee",
    keys: ["dashboard.read"]
  },
  STUDENT: {
    name: "Student",
    keys: ["portal.self"]
  },
  PARENT: {
    name: "Parent",
    keys: ["portal.child"]
  }
};
