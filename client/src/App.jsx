import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "./api/client";
import { setSession, logout } from "./store/authSlice";
import { DashboardLayout } from "./layouts/DashboardLayout.jsx";
import { RequireAuth } from "./components/auth/ProtectedRoute.jsx";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { RegisterPage } from "./pages/auth/RegisterPage.jsx";
import { SelectInstitutePage } from "./pages/auth/SelectInstitutePage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import { Institutes, InstituteSettings } from "./pages/Institutes.jsx";
import { RolesPage, MembershipsPage, GrantsPage, OverridesPage } from "./pages/RbacPages.jsx";
import { EmployeesPage, EmployeeProfile, DeletedEmployees, HrPage } from "./pages/HrPages.jsx";
import { AcademicPage, AssignmentsPage } from "./pages/AcademicPages.jsx";
import { StudentsPage, StudentProfile, DeletedStudents, AttendancePage } from "./pages/StudentPages.jsx";
import {
  ExamsPage,
  LibraryPage,
  HostelPage,
  TransportPage,
  AuditPage,
  StudentPortal,
  StudentSelfProfile,
  StudentPortalAssignments,
  StudentPortalFees,
  StudentPortalResults,
  StudentPortalNotices,
  ParentPortal
} from "./pages/OpsPages.jsx";
import { AppToaster } from "./components/AppToaster.jsx";
import {
  FeesHomePage,
  FeeStructuresPage,
  FeeStructureDetailPage,
  FeeEnrollmentsPage,
  FeeDuesPage,
  FeeCollectPage,
  FeeReportsPage
} from "./pages/FeesPages.jsx";

export default function App() {
  const token = useSelector((s) => s.auth.token);
  const institute = useSelector((s) => s.auth.institute);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!token) return;
    api
      .get("/auth/me")
      .then(({ data }) => dispatch(setSession({ ...data.data, token })))
      .catch((err) => {
        if (err.response?.status === 401) dispatch(logout());
      });
  }, [token, dispatch]);

  return (
    <>
      <AppToaster />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/select-institute"
        element={
          <RequireAuth>
            <SelectInstitutePage />
          </RequireAuth>
        }
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            {!institute && token ? (
              <Navigate to="/select-institute" replace />
            ) : (
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/institutes" element={<Institutes />} />
                  <Route path="/institute" element={<InstituteSettings />} />
                  <Route path="/roles" element={<RolesPage />} />
                  <Route path="/memberships" element={<MembershipsPage />} />
                  <Route path="/grants" element={<GrantsPage />} />
                  <Route path="/overrides" element={<OverridesPage />} />
                  <Route path="/employees" element={<EmployeesPage />} />
                  <Route path="/employees/deleted" element={<DeletedEmployees />} />
                  <Route path="/employees/:id" element={<EmployeeProfile />} />
                  <Route path="/hr" element={<HrPage />} />
                  <Route path="/academic" element={<AcademicPage />} />
                  <Route path="/assignments" element={<AssignmentsPage />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/students/deleted" element={<DeletedStudents />} />
                  <Route path="/students/:id" element={<StudentProfile />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/fees" element={<FeesHomePage />} />
                  <Route path="/fees/structures" element={<FeeStructuresPage />} />
                  <Route path="/fees/structures/:id" element={<FeeStructureDetailPage />} />
                  <Route path="/fees/enrollments" element={<FeeEnrollmentsPage />} />
                  <Route path="/fees/dues" element={<FeeDuesPage />} />
                  <Route path="/fees/collect" element={<FeeCollectPage />} />
                  <Route path="/fees/reports" element={<FeeReportsPage />} />
                  <Route path="/exams" element={<ExamsPage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/hostel" element={<HostelPage />} />
                  <Route path="/transport" element={<TransportPage />} />
                  <Route path="/audit" element={<AuditPage />} />
                  <Route path="/portal/student/profile" element={<StudentSelfProfile />} />
                  <Route path="/portal/student/assignments" element={<StudentPortalAssignments />} />
                  <Route path="/portal/student/fees" element={<StudentPortalFees />} />
                  <Route path="/portal/student/results" element={<StudentPortalResults />} />
                  <Route path="/portal/student/notices" element={<StudentPortalNotices />} />
                  <Route path="/portal/student" element={<StudentPortal />} />
                  <Route path="/portal/parent" element={<ParentPortal />} />
                </Routes>
              </DashboardLayout>
            )}
          </RequireAuth>
        }
      />
    </Routes>
    </>
  );
}
