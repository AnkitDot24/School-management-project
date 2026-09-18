import express from "express";
import {
  authenticate,
  instituteContext,
  protectedInstitute,
  requirePermission,
  requireAnyPermission
} from "../middleware/auth.js";
import { optionalImage } from "../middleware/upload.js";
import { authLimiter } from "../middleware/rateLimit.js";
import * as auth from "../controllers/authController.js";
import * as inst from "../controllers/instituteController.js";
import * as rbac from "../controllers/rbacController.js";
import * as emp from "../controllers/employeeController.js";
import * as ac from "../controllers/academicController.js";
import * as st from "../controllers/studentController.js";
import * as att from "../controllers/attendanceController.js";
import * as fee from "../controllers/feeController.js";
import * as feeStruct from "../controllers/feeStructureController.js";
import * as feeEnroll from "../controllers/feeEnrollmentController.js";
import * as ops from "../controllers/opsController.js";
import * as portal from "../controllers/portalController.js";

const r = express.Router();

r.post("/auth/register", optionalImage("avatar"), auth.registerValidators, auth.register);
r.post("/auth/login", auth.loginValidators, auth.login);
r.get("/auth/memberships", authenticate, auth.myMemberships);
r.patch("/auth/profile", authenticate, optionalImage("avatar"), auth.updateProfileValidators, auth.updateProfile);
r.post("/auth/select-institute", authenticate, auth.selectInstituteValidators, auth.selectInstitute);
r.get("/auth/me", authenticate, async (req, res, next) => {
  if (req.user.isSuperAdmin || req.auth.instituteId) return instituteContext(req, res, next);
  next();
}, auth.me);
r.post("/auth/logout", authenticate, auth.logout);

r.get("/institutes", authenticate, inst.listInstitutes);
r.post("/institutes", authenticate, optionalImage("logo"), inst.createInstituteValidators, inst.createInstitute);
r.get("/institutes/current", ...protectedInstitute, requireAnyPermission(["institute.read", "dashboard.read"]), inst.getInstitute);
r.patch("/institutes/:id", ...protectedInstitute, requirePermission("institute.update"), optionalImage("logo"), inst.updateInstitute);
r.post("/institutes/:id/soft-delete", authenticate, inst.softDeleteInstituteValidators, inst.softDeleteInstitute);

r.get("/permissions", ...protectedInstitute, requirePermission("rbac.read"), rbac.listPermissions);
r.get("/roles", ...protectedInstitute, requirePermission("rbac.read"), rbac.listRoles);
r.put("/roles/:id/permissions", ...protectedInstitute, requirePermission("rbac.manage"), rbac.setRolePermissionsValidators, rbac.setRolePermissions);
r.get("/memberships/next-code", ...protectedInstitute, requirePermission("rbac.read"), rbac.peekNextMembershipCode);
r.get("/memberships", ...protectedInstitute, requirePermission("rbac.read"), rbac.listMemberships);
r.post("/memberships", ...protectedInstitute, requirePermission("membership.manage"), rbac.createMembershipValidators, rbac.createMembership);
r.post("/memberships/:id/roles", ...protectedInstitute, requirePermission("membership.manage"), rbac.addMembershipRoleValidators, rbac.addMembershipRole);
r.delete("/memberships/:id/roles/:roleId", ...protectedInstitute, requirePermission("membership.manage"), rbac.removeMembershipRole);
r.get("/temporary-grants", ...protectedInstitute, requirePermission("rbac.read"), rbac.listGrants);
r.post("/temporary-grants", ...protectedInstitute, requirePermission("rbac.manage"), rbac.grantValidators, rbac.createGrant);
r.delete("/temporary-grants/:id", ...protectedInstitute, requirePermission("rbac.manage"), rbac.deleteGrant);
r.get("/permission-overrides", ...protectedInstitute, requirePermission("rbac.read"), rbac.listOverrides);
r.post("/permission-overrides", ...protectedInstitute, requirePermission("rbac.manage"), rbac.overrideValidators, rbac.createOverride);
r.delete("/permission-overrides/:id", ...protectedInstitute, requirePermission("rbac.manage"), rbac.deleteOverride);

r.get("/employees", ...protectedInstitute, requirePermission("employee.read"), emp.listEmployees);
r.get("/employees/deleted", ...protectedInstitute, requirePermission("employee.restore"), emp.listDeletedEmployees);
r.get("/employees/eligible-teachers", ...protectedInstitute, requirePermission("assignment.read"), emp.listEligibleTeachers);
r.get("/employees/next-code", ...protectedInstitute, requirePermission("employee.write"), emp.peekEmployeeCode);
r.post("/employees", ...protectedInstitute, requirePermission("employee.write"), optionalImage("photo"), emp.employeeValidators, emp.createEmployee);
r.get("/employees/:id", ...protectedInstitute, requirePermission("employee.read"), emp.getEmployee);
r.patch("/employees/:id", ...protectedInstitute, requirePermission("employee.write"), optionalImage("photo"), emp.updateEmployee);
r.put("/employees/:id", ...protectedInstitute, requirePermission("employee.write"), optionalImage("photo"), emp.updateEmployee);
r.post("/employees/:id/soft-delete", ...protectedInstitute, requirePermission("employee.write"), emp.softDeleteEmployeeValidators, emp.softDeleteEmployee);
r.post("/employees/:id/restore", ...protectedInstitute, requirePermission("employee.restore"), emp.restoreEmployee);
r.get("/leaves", ...protectedInstitute, requirePermission("hr.leave"), emp.listLeaves);
r.post("/leaves", ...protectedInstitute, requirePermission("hr.leave"), emp.leaveValidators, emp.createLeave);
r.patch("/leaves/:id", ...protectedInstitute, requirePermission("hr.leave"), emp.updateLeave);
r.get("/staff-attendance", ...protectedInstitute, requirePermission("hr.staffAttendance"), emp.listStaffAttendance);
r.post("/staff-attendance", ...protectedInstitute, requirePermission("hr.staffAttendance"), emp.staffAttValidators, emp.upsertStaffAttendance);

r.get("/academic-years", ...protectedInstitute, requirePermission("academic.read"), ac.listYears);
r.post("/academic-years", ...protectedInstitute, requirePermission("academic.write"), ac.yearValidators, ac.createYear);
r.get("/classes", ...protectedInstitute, requirePermission("academic.read"), ac.listClasses);
r.post("/classes", ...protectedInstitute, requirePermission("academic.write"), ac.classValidators, ac.createClass);
r.get("/sections", ...protectedInstitute, requirePermission("academic.read"), ac.listSections);
r.post("/sections", ...protectedInstitute, requirePermission("academic.write"), ac.sectionValidators, ac.createSection);
r.get("/subjects", ...protectedInstitute, requirePermission("academic.read"), ac.listSubjects);
r.post("/subjects", ...protectedInstitute, requirePermission("academic.write"), ac.subjectValidators, ac.createSubject);

r.get("/class-subjects", ...protectedInstitute, requirePermission("academic.read"), ac.listClassSubjects);
r.post("/class-subjects", ...protectedInstitute, requirePermission("academic.write"), ac.classSubjectValidators, ac.createClassSubject);
r.get("/assignments/subject-teachers", ...protectedInstitute, requirePermission("assignment.read"), ac.listSubjectTeachers);
r.post("/assignments/subject-teachers", ...protectedInstitute, requirePermission("assignment.write"), ac.subjectTeacherValidators, ac.createSubjectTeacher);

r.get("/assignments/class-subject-teachers", ...protectedInstitute, requirePermission("assignment.read"), ac.listCST);
r.post("/assignments/class-subject-teachers", ...protectedInstitute, requirePermission("assignment.write"), ac.cstValidators, ac.createCST);
r.get("/assignments/section-class-teachers", ...protectedInstitute, requirePermission("assignment.read"), ac.listSCT);
r.post("/assignments/section-class-teachers", ...protectedInstitute, requirePermission("assignment.write"), ac.sctValidators, ac.createSCT);
r.get("/assignments/section-subject-teachers", ...protectedInstitute, requirePermission("assignment.read"), ac.listSST);
r.post("/assignments/section-subject-teachers", ...protectedInstitute, requirePermission("assignment.write"), ac.sstValidators, ac.createSST);

r.get("/students", ...protectedInstitute, requirePermission("student.read"), st.listStudents);
r.get("/students/deleted", ...protectedInstitute, requirePermission("student.restore"), st.listDeletedStudents);
r.get("/students/next-admission-no", ...protectedInstitute, requirePermission("student.write"), st.peekStudentAdmissionNo);
r.get("/students/:id", ...protectedInstitute, requirePermission("student.read"), st.getStudent);
r.post("/students", ...protectedInstitute, requirePermission("student.write"), optionalImage("photo"), st.studentValidators, st.createStudent);
r.patch("/students/:id", ...protectedInstitute, requirePermission("student.write"), optionalImage("photo"), st.updateStudent);
r.put("/students/:id", ...protectedInstitute, requirePermission("student.write"), optionalImage("photo"), st.updateStudent);
r.post("/students/:id/soft-delete", ...protectedInstitute, requirePermission("student.softDelete"), st.softDeleteValidators, st.softDeleteStudent);
r.post("/students/:id/restore", ...protectedInstitute, requirePermission("student.restore"), st.restoreStudent);
r.get("/parent-links", ...protectedInstitute, requirePermission("student.read"), st.listParentLinks);
r.post("/parent-links", ...protectedInstitute, requirePermission("student.write"), st.parentLinkValidators, st.createParentLink);

r.post(
  "/attendance/punch-in",
  ...protectedInstitute,
  requireAnyPermission(["attendance.punch", "portal.self"]),
  att.punchValidators,
  att.punchIn
);
r.post(
  "/attendance/punch-out",
  ...protectedInstitute,
  requireAnyPermission(["attendance.punch", "portal.self"]),
  att.punchValidators,
  att.punchOut
);
r.get("/attendance/my", ...protectedInstitute, att.myAttendance);
r.get("/student-attendance/dashboard", ...protectedInstitute, att.studentAttendanceDashboard);
r.get(
  "/attendance/:studentId",
  ...protectedInstitute,
  requireAnyPermission(["attendance.read", "portal.self"]),
  att.studentIdParam,
  att.listAttendanceForStudent
);
r.get("/attendance", ...protectedInstitute, requirePermission("attendance.read"), att.listAttendance);

r.get("/fees/structures", ...protectedInstitute, requireAnyPermission(["fees.read", "fees.structure"]), feeStruct.listStructures);
r.post(
  "/fees/structures",
  ...protectedInstitute,
  requirePermission("fees.structure"),
  feeStruct.structureValidators,
  feeStruct.createStructure
);
r.get(
  "/fees/structures/:id/components",
  ...protectedInstitute,
  requireAnyPermission(["fees.read", "fees.structure"]),
  feeStruct.structureIdParam,
  feeStruct.listComponents
);
r.post(
  "/fees/structures/:id/components",
  ...protectedInstitute,
  requirePermission("fees.structure"),
  feeStruct.structureIdParam,
  feeStruct.componentValidators,
  feeStruct.addComponent
);
r.get(
  "/fees/structures/:id",
  ...protectedInstitute,
  requireAnyPermission(["fees.read", "fees.structure"]),
  feeStruct.structureIdParam,
  feeStruct.getStructure
);
r.patch(
  "/fees/structures/:id",
  ...protectedInstitute,
  requirePermission("fees.structure"),
  feeStruct.structureIdParam,
  feeStruct.updateStructure
);

r.get("/fees/enrollments", ...protectedInstitute, requirePermission("fees.read"), feeEnroll.listEnrollments);
r.post("/fees/enrollments", ...protectedInstitute, requirePermission("fees.assign"), feeEnroll.enrollValidators, feeEnroll.createEnrollment);
r.post(
  "/fees/enrollments/bulk",
  ...protectedInstitute,
  requirePermission("fees.assign"),
  feeEnroll.bulkEnrollValidators,
  feeEnroll.bulkEnroll
);
r.post(
  "/fees/enrollments/:id/generate-dues",
  ...protectedInstitute,
  requirePermission("fees.assign"),
  feeEnroll.enrollmentIdParam,
  feeEnroll.generateDues
);

r.get("/fees/dues", ...protectedInstitute, requirePermission("fees.read"), feeEnroll.listDues);
r.get("/fees/dues/:id", ...protectedInstitute, requirePermission("fees.read"), feeEnroll.dueIdParam, feeEnroll.getDue);

r.get("/fees/assignments", ...protectedInstitute, requirePermission("fees.read"), fee.listAssignments);
r.post("/fees/assignments", ...protectedInstitute, requirePermission("fees.assign"), fee.assignValidators, fee.createAssignment);
r.post("/fees/payments", ...protectedInstitute, requirePermission("fees.collect"), fee.payValidators, fee.collectPayment);
r.post(
  "/fees/payments/:id/refund",
  ...protectedInstitute,
  requirePermission("fees.refund"),
  fee.paymentIdParam,
  fee.refundValidators,
  fee.refundPayment
);
r.get(
  "/fees/receipts/:paymentId",
  ...protectedInstitute,
  requireAnyPermission(["fees.read", "fees.collect"]),
  fee.receiptParam,
  fee.getReceipt
);
r.get("/fees/dashboard", ...protectedInstitute, requireAnyPermission(["fees.read", "fees.reports"]), fee.dashboard);
r.get("/fees/reports/collections", ...protectedInstitute, requirePermission("fees.reports"), fee.reportsCollections);
r.get("/fees/reports/outstanding", ...protectedInstitute, requirePermission("fees.reports"), fee.reportsOutstanding);
r.get("/fees/reports/structure-summary", ...protectedInstitute, requirePermission("fees.reports"), fee.reportsStructureSummary);
r.get("/fees/reports", ...protectedInstitute, requirePermission("fees.reports"), fee.reports);

r.get("/exams", ...protectedInstitute, requirePermission("exam.read"), ops.listExams);
r.post("/exams", ...protectedInstitute, requirePermission("exam.write"), ops.examValidators, ops.createExam);
r.get("/exam-marks", ...protectedInstitute, requirePermission("exam.read"), ops.listMarks);
r.post("/exam-marks", ...protectedInstitute, requirePermission("exam.write"), ops.markValidators, ops.upsertMark);

r.get("/library/items", ...protectedInstitute, requirePermission("library.read"), ops.books.list);
r.post("/library/items", ...protectedInstitute, requirePermission("library.write"), ops.bookValidators, ops.books.create);
r.get("/library/circulation", ...protectedInstitute, requirePermission("library.read"), ops.listCirculation);
r.post("/library/issue", ...protectedInstitute, requirePermission("library.write"), ops.issueValidators, ops.issueBook);
r.post("/library/circulation/:id/return", ...protectedInstitute, requirePermission("library.write"), ops.returnBook);

r.get("/hostel/blocks", ...protectedInstitute, requirePermission("hostel.read"), ops.blocks.list);
r.post("/hostel/blocks", ...protectedInstitute, requirePermission("hostel.write"), ops.blockValidators, ops.blocks.create);
r.get("/hostel/rooms", ...protectedInstitute, requirePermission("hostel.read"), ops.listRooms);
r.post("/hostel/rooms", ...protectedInstitute, requirePermission("hostel.write"), ops.roomValidators, ops.createRoom);
r.get("/hostel/allocations", ...protectedInstitute, requirePermission("hostel.read"), ops.listAlloc);
r.post("/hostel/allocations", ...protectedInstitute, requirePermission("hostel.write"), ops.allocValidators, ops.createAlloc);

r.get("/transport/vehicles", ...protectedInstitute, requirePermission("transport.read"), ops.vehicles.list);
r.post("/transport/vehicles", ...protectedInstitute, requirePermission("transport.write"), ops.vehicleValidators, ops.vehicles.create);
r.get("/transport/drivers", ...protectedInstitute, requirePermission("transport.read"), ops.drivers.list);
r.post("/transport/drivers", ...protectedInstitute, requirePermission("transport.write"), ops.driverValidators, ops.drivers.create);
r.get("/transport/routes", ...protectedInstitute, requirePermission("transport.read"), ops.routes.list);
r.post("/transport/routes", ...protectedInstitute, requirePermission("transport.write"), ops.routeValidators, ops.routes.create);
r.get("/transport/assignments", ...protectedInstitute, requirePermission("transport.read"), ops.listTAssign);
r.post("/transport/assignments", ...protectedInstitute, requirePermission("transport.write"), ops.tassignValidators, ops.createTAssign);

r.get("/audit-logs", ...protectedInstitute, requirePermission("audit.read"), ops.listAudit);
r.get("/dashboard", ...protectedInstitute, requirePermission("dashboard.read"), ops.dashboardStats);

r.get("/portal/student/profile", ...protectedInstitute, portal.studentProfile);
r.put(
  "/portal/student/profile/photo",
  ...protectedInstitute,
  optionalImage("photo"),
  portal.updateStudentProfilePhoto
);
r.get("/portal/student/fees", ...protectedInstitute, portal.studentPortalFees);
r.get("/portal/student/results", ...protectedInstitute, portal.studentPortalResults);
r.get("/portal/student/assignments", ...protectedInstitute, portal.studentPortalAssignments);
r.get("/portal/student", ...protectedInstitute, portal.studentPortal);
r.get("/portal/parent", ...protectedInstitute, portal.parentPortal);

export default r;
