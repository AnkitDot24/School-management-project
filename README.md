# School Management System (MongoDB MERN)

Institute-scoped school ERP: JWT auth, RBAC, students, employees, academic setup, fees, attendance, student/parent portal, audit logs, and soft-delete.

## Stack

| Layer | Technology |
|--------|------------|
| Frontend | React 18, Vite, Tailwind CSS v3, Redux Toolkit |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB (local or Atlas) |
| Auth | JWT + institute membership after campus selection |

All API routes are under **`/api/v1`**. The React app proxies `/api` and `/uploads` to the backend in development.

### Institute public IDs

Each campus assigns unique, human-readable IDs (scoped by `instituteId`), format **`XXX-######`**.

| Role | Prefix | Stored on | Where shown in UI |
|------|--------|-----------|-------------------|
| Student | `STU` | `Student.admissionNo` (preferred over membership) | Profile, sidebar badge, student lists, fees receipts, portal |
| Employee / staff on HR roster | `EMP` | `Employee.employeeCode` (preferred for linked users, including teachers) | Profile, sidebar badge, HR employee directory |
| Institute Admin | `ADM` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| Principal | `PRN` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| Teacher (no HR link yet) | `TCH` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| Accountant | `ACC` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| CFO | `CFO` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| HR Manager | `HRM` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| Librarian | `LIB` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| Hostel Warden | `HST` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| Transport Admin | `TRN` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| Parent | `PAR` | `Membership.memberCode` | Profile, memberships table, sidebar badge |
| Unknown / legacy role | `MEM` | `Membership.memberCode` | Fallback prefix only |

**Display rule:** Profile and the sidebar show the best ID for the active campus — **`STU-`** / **`EMP-`** when a student or employee record is linked to the user, otherwise the membership **`memberCode`** for their primary role.

- **Create:** omit the ID field to auto-allocate; optional manual `EMP-` / `STU-` on employee/student create only.
- **Preview:** `GET /employees/next-code`, `GET /students/next-admission-no`, `GET /memberships/next-code?roleCode=TEACHER`.
- **Update:** all public IDs are immutable after creation.
- **Migration:** run `node scripts/backfill-member-codes.js` from `server/` for memberships created before `memberCode` existed.

---

## Setup

### Prerequisites

- **Node.js 18+**
- **MongoDB** running locally or a MongoDB Atlas connection string

### 1. Clone and install

From the repo root:

```bash
npm run install:all
```

Or install each app separately:

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Backend environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing secret for tokens |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `CLIENT_ORIGIN` | CORS origin (e.g. `http://localhost:5173`) |
| `SUPER_ADMIN_EMAIL` | Platform super admin email (created on first boot) |
| `SUPER_ADMIN_PASSWORD` | Super admin password |

### 3. Run the API

```bash
cd server
npm run dev
```

- Entry: `server/index.js` (nodemon)
- Health check: `GET http://localhost:5000/api/v1/health`

On startup the server **upserts permissions** and creates the **super admin** user if missing. New institutes get default roles when created.

### 4. Run the frontend

```bash
cd client
npm run dev
```

- UI: **http://localhost:5173**
- Vite proxies API calls to `http://localhost:5000`

### 5. First login (UI)

1. Open **http://localhost:5173/login**
2. Sign in (see [Test credentials](#test-credentials) below)
3. Choose institute **Delhi Public School — Demo (`DPSDELHI`)** if you use demo data
4. Use the sidebar according to your role permissions

### 6. Automated role checks (optional)

With the API running and demo users present in MongoDB:

```bash
cd server
npm run test:roles
```

This logs in each demo role, selects `DPSDELHI`, and verifies permissions (and student/parent portal endpoints).

---

## Auth flow

1. **`POST /auth/login`** — `{ "email", "password" }` → JWT (user + memberships list)
2. **`POST /auth/select-institute`** — `{ "instituteId", "membershipId"? }` → JWT with institute context, roles, and `effectivePermissions`
3. **`GET /auth/me`** — Current user + institute context (requires Bearer token)
4. Protected routes: **`Authorization: Bearer <token>`**
5. Optional header (must match token institute): **`X-Institute-UUID`** — institute `_id` or `code`

### Response envelope

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "errors": null
}
```

### Common HTTP status codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Validation failed |
| 401 | Not authenticated |
| 403 | Forbidden / wrong institute |
| 404 | Not found |
| 409 | Conflict |
| 422 | Business rule violation |
| 500 | Server error |

---

## API overview

Base URL: **`http://localhost:5000/api/v1`**

Routes below require a **post–select-institute** token unless marked *public* or *auth-only*.

### Health

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | No auth |

### Auth (*auth-only* until institute selected)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/register` | Multipart optional `avatar` |
| POST | `/auth/login` | *Public* |
| GET | `/auth/memberships` | List memberships |
| POST | `/auth/select-institute` | Institute-scoped token |
| GET | `/auth/me` | Profile + permissions |
| PATCH | `/auth/profile` | Update profile / avatar |

### Institutes

| Method | Path | Permission (typical) |
|--------|------|----------------------|
| GET | `/institutes` | Super admin / authenticated list |
| POST | `/institutes` | Create campus |
| GET | `/institutes/current` | `institute.read` or `dashboard.read` |
| PATCH | `/institutes/:id` | `institute.update` |

### RBAC

| Method | Path | Permission |
|--------|------|------------|
| GET | `/permissions` | `rbac.read` |
| GET | `/roles` | `rbac.read` |
| PUT | `/roles/:id/permissions` | `rbac.manage` |
| GET/POST | `/memberships` | read / `membership.manage` |
| POST/DELETE | `/memberships/:id/roles` | `membership.manage` |
| GET/POST/DELETE | `/temporary-grants` | `rbac.read` / `rbac.manage` |
| GET/POST/DELETE | `/permission-overrides` | `rbac.read` / `rbac.manage` |

### HR & employees

| Method | Path | Permission |
|--------|------|------------|
| GET/POST/PATCH | `/employees` | `employee.read` / `employee.write` |
| POST | `/employees/:id/soft-delete` | `employee.write` |
| GET/POST/PATCH | `/leaves` | `hr.leave` |
| GET/POST | `/staff-attendance` | `hr.staffAttendance` |

### Academic

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/academic-years` | `academic.read` / `academic.write` |
| GET/POST | `/classes`, `/sections`, `/subjects` | `academic.*` |
| GET/POST | `/assignments/class-subject-teachers` | `assignment.*` |
| GET/POST | `/assignments/section-class-teachers` | `assignment.*` |
| GET/POST | `/assignments/section-subject-teachers` | `assignment.*` |

### Students

| Method | Path | Permission |
|--------|------|------------|
| GET/POST/PATCH | `/students` | `student.read` / `student.write` |
| GET | `/students/deleted` | `student.restore` |
| POST | `/students/:id/soft-delete` | `student.softDelete` |
| POST | `/students/:id/restore` | `student.restore` |
| GET/POST | `/parent-links` | `student.read` / `student.write` |

### Attendance

| Method | Path | Permission |
|--------|------|------------|
| POST | `/attendance/punch-in`, `/attendance/punch-out` | `attendance.punch` or `portal.self` (self punch) |
| GET | `/attendance/my` | Student portal |
| GET | `/student-attendance/dashboard` | Student portal summary |
| GET | `/attendance/:studentId` | `attendance.read` or own student |
| GET | `/attendance` | `attendance.read` (filters: `studentId`, dates) |

### Fees

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/fees/structures` | `fees.read` / `fees.structure` |
| GET/POST | `/fees/structures/:id/components` | structure components |
| GET/PATCH | `/fees/structures/:id` | structure detail |
| GET/POST | `/fees/enrollments`, `/fees/enrollments/bulk` | `fees.assign` |
| POST | `/fees/enrollments/:id/generate-dues` | `fees.assign` |
| GET | `/fees/dues`, `/fees/dues/:id` | `fees.read` |
| GET/POST | `/fees/assignments` | legacy flat assignments |
| POST | `/fees/payments`, `/fees/payments/:id/refund` | `fees.collect` / `fees.refund` |
| GET | `/fees/receipts/:paymentId` | `fees.read` or `fees.collect` |
| GET | `/fees/dashboard` | `fees.read` or `fees.reports` |
| GET | `/fees/reports/collections`, `/outstanding`, `/structure-summary` | `fees.reports` |

### Exams, library, hostel, transport

| Area | Paths | Permissions |
|------|--------|-------------|
| Exams | `/exams`, `/exam-marks` | `exam.read`, `exam.write` |
| Library | `/library/items`, `/library/issue`, `/library/circulation` | `library.read`, `library.write` |
| Hostel | `/hostel/blocks`, `/hostel/rooms`, `/hostel/allocations` | `hostel.read`, `hostel.write` |
| Transport | `/transport/vehicles`, `/drivers`, `/routes`, `/assignments` | `transport.read`, `transport.write` |

### Portal

| Method | Path | Permission |
|--------|------|------------|
| GET | `/portal/student` | `portal.self` — dashboard bundle |
| GET | `/portal/student/profile` | `portal.self` |
| PUT | `/portal/student/profile/photo` | `portal.self` |
| GET | `/portal/student/fees`, `/results`, `/assignments` | `portal.self` |
| GET | `/portal/parent` | `portal.child` |

### Ops

| Method | Path | Permission |
|--------|------|------------|
| GET | `/dashboard` | `dashboard.read` |
| GET | `/audit-logs` | `audit.read` |

---

## Test credentials

Demo data is stored in **MongoDB** (institute **Delhi Public School — Demo**, code **`DPSDELHI`**). Demo Gmail addresses use **no dots** in the local part so login normalization matches the database.

**Shared password for all demo institute users:** `Test@123456`

| Role | Name | Email |
|------|------|--------|
| Institute Admin | Rajesh Kumar | `rajeshkumardpsadmin@gmail.com` |
| Principal | Anita Desai | `anitadesaiprincipal@gmail.com` |
| Teacher | Vikram Singh | `vikramsinghteacher@gmail.com` |
| Accountant | Meera Iyer | `meeraiyeraccountant@gmail.com` |
| CFO | Arun Nair | `arunnaircfo@gmail.com` |
| HR Manager | Kavita Reddy | `kavitareddyhr@gmail.com` |
| Librarian | Suresh Pillai | `sureshpillailibrary@gmail.com` |
| Hostel Warden | Lakshmi Menon | `lakshmimenonhostel@gmail.com` |
| Transport Admin | Rahul Gupta | `rahulguptatransport@gmail.com` |
| Employee | Deepak Joshi | `deepakjoshistaff@gmail.com` |
| Student | Aarav Sharma | `aaravsharmastudent@gmail.com` |
| Parent | Priya Sharma | `priyasharmaparent@gmail.com` |

### Platform super admin

From `server/.env` (defaults):

| Email | Password |
|--------|----------|
| `admin@platform.com` | `Admin@123` |

Super admin can list all institutes and enter any campus without a membership row.

### Demo academic setup (if seeded)

- Academic year **2025-26**
- Classes **Class 10**, **Class 9**; sections **A** / **B**
- Demo student **Aarav** enrolled in **Class 10 · A**

If class/section dropdowns are empty, create years/classes/sections under **Academic Setup** in the UI.

---

## Postman

Import [`docs/postman/School-Management.postman_collection.json`](docs/postman/School-Management.postman_collection.json).

Suggested variables: `baseUrl` = `http://localhost:5000/api/v1`, `token`, `instituteId`.

---

## Project layout

| Path | Description |
|------|-------------|
| `server/` | Express API, models, RBAC bootstrap (`src/rbac/`) |
| `client/` | React SPA ([`client/src/FRONTEND_STRUCTURE.md`](client/src/FRONTEND_STRUCTURE.md)) |
| `docs/postman/` | Postman collection |

---

## Development notes

- **Soft delete** on students, employees, institutes: `isDeleted`, `deletedBy`, `deletedAt`, `deleteReason`.
- **Audit logs** include `actorName`, client IP, and delete reasons where applicable.
- **Student portal**: link `Student.userId` to a user with **STUDENT** role membership; parent portal uses `ParentStudentLink` + **PARENT** role.
- Legacy **`/fees/assignments`** remains for older records; newer fee flows may use structure/enrollment models where implemented in your deployment.
