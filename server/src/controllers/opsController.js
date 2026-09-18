import { body } from "express-validator";
import {
  Exam,
  ExamMark,
  Student,
  Subject,
  AcademicYear,
  LibraryItem,
  Circulation,
  HostelBlock,
  HostelRoom,
  HostelAllocation,
  Vehicle,
  Driver,
  TransportRoute,
  TransportAssignment
} from "../models/index.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import { notDeleted } from "../utils/softDelete.js";
import { AuditLog, Student as StudentModel, Employee, AttendanceDay } from "../models/index.js";

const iid = (req) => req.institute._id;

export const examValidators = [
  body("name").trim().notEmpty(),
  body("academicYearId").isMongoId(),
  body("startDate").optional().isISO8601(),
  body("endDate").optional().isISO8601(),
  validate
];
export const listExams = asyncHandler(async (req, res) => ok(res, await Exam.find({ instituteId: iid(req) }).populate("academicYearId classId")));
export const createExam = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findOne({ _id: req.body.academicYearId, instituteId: iid(req) });
  if (!year) return fail(res, 422, "Academic year not found");
  const doc = await Exam.create({ ...req.body, instituteId: iid(req) });
  await writeAudit(req, { action: "exam.create", entity: "Exam", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const markValidators = [
  body("examId").isMongoId(),
  body("studentId").isMongoId(),
  body("subjectId").isMongoId(),
  body("marks").isFloat({ min: 0 }),
  body("maxMarks").optional().isFloat({ min: 1 }),
  body("grade").optional().isString(),
  validate
];

export const upsertMark = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.body.examId, instituteId: iid(req) });
  const student = await Student.findOne(notDeleted({ _id: req.body.studentId, instituteId: iid(req) }));
  const subject = await Subject.findOne({ _id: req.body.subjectId, instituteId: iid(req) });
  if (!exam || !student || !subject) return fail(res, 422, "Exam, student, and subject required");
  const maxMarks = Number(req.body.maxMarks || 100);
  if (Number(req.body.marks) > maxMarks) return fail(res, 422, "Marks cannot exceed maxMarks");
  const updateData = { instituteId: iid(req), marks: req.body.marks, maxMarks };
  if (req.body.grade !== undefined) updateData.grade = req.body.grade;
  const doc = await ExamMark.findOneAndUpdate(
    { examId: exam._id, studentId: student._id, subjectId: subject._id },
    updateData,
    { upsert: true, new: true }
  );
  await writeAudit(req, { action: "exam.mark", entity: "ExamMark", entityId: doc._id, after: doc });
  return ok(res, doc);
});

export const listMarks = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.examId) filter.examId = req.query.examId;
  return ok(res, await ExamMark.find(filter).populate("examId studentId subjectId"));
});

function crud(Model, action, extraValidate) {
  return {
    list: asyncHandler(async (req, res) => {
      const filter = { instituteId: iid(req) };
      const q = String(req.query.q || "").trim();
      if (q) {
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { number: { $regex: q, $options: "i" } },
          { title: { $regex: q, $options: "i" } },
          { author: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } }
        ];
      }
      const sortKey = req.query.sort;
      const sort =
        sortKey === "oldest" ? { createdAt: 1 }
        : sortKey === "name" ? { name: 1, title: 1, number: 1 }
        : { createdAt: -1 };
      return ok(res, await Model.find(filter).sort(sort));
    }),
    create: asyncHandler(async (req, res) => {
      if (extraValidate) {
        const err = await extraValidate(req);
        if (err) return fail(res, 422, err);
      }
      const doc = await Model.create({ ...req.body, instituteId: iid(req) });
      await writeAudit(req, { action: `${action}.create`, entity: Model.modelName, entityId: doc._id, after: doc });
      return created(res, doc);
    })
  };
}

export const books = crud(LibraryItem, "library");
export const bookValidators = [body("title").trim().notEmpty(), validate];

export const issueValidators = [
  body("libraryItemId").isMongoId(),
  body("studentId").isMongoId(),
  body("dueAt").isISO8601(),
  validate
];

export const listCirculation = asyncHandler(async (req, res) =>
  ok(res, await Circulation.find({ instituteId: iid(req) }).populate("libraryItemId studentId"))
);

export const issueBook = asyncHandler(async (req, res) => {
  const item = await LibraryItem.findOne({ _id: req.body.libraryItemId, instituteId: iid(req) });
  const student = await Student.findOne(notDeleted({ _id: req.body.studentId, instituteId: iid(req) }));
  if (!item || !student) return fail(res, 422, "Book and student required");
  const open = await Circulation.countDocuments({ libraryItemId: item._id, returnedAt: null });
  if (open >= item.copies) return fail(res, 422, "No copies available");
  const doc = await Circulation.create({
    instituteId: iid(req),
    libraryItemId: item._id,
    studentId: student._id,
    issuedAt: new Date(),
    dueAt: req.body.dueAt
  });
  await writeAudit(req, { action: "library.issue", entity: "Circulation", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const returnBook = asyncHandler(async (req, res) => {
  const doc = await Circulation.findOne({ _id: req.params.id, instituteId: iid(req) });
  if (!doc) return fail(res, 404, "Circulation not found");
  if (doc.returnedAt) return fail(res, 422, "Already returned");
  doc.returnedAt = new Date();
  await doc.save();
  await writeAudit(req, { action: "library.return", entity: "Circulation", entityId: doc._id, after: doc });
  return ok(res, doc);
});

export const blocks = crud(HostelBlock, "hostel");
export const blockValidators = [body("name").trim().notEmpty(), validate];
export const roomValidators = [body("blockId").isMongoId(), body("name").trim().notEmpty(), validate];
export const listRooms = asyncHandler(async (req, res) => ok(res, await HostelRoom.find({ instituteId: iid(req) }).populate("blockId")));
export const createRoom = asyncHandler(async (req, res) => {
  const block = await HostelBlock.findOne({ _id: req.body.blockId, instituteId: iid(req) });
  if (!block) return fail(res, 422, "Block not found");
  const doc = await HostelRoom.create({ instituteId: iid(req), blockId: block._id, name: req.body.name, capacity: req.body.capacity || 2 });
  await writeAudit(req, { action: "hostel.room.create", entity: "HostelRoom", entityId: doc._id, after: doc });
  return created(res, doc);
});
export const allocValidators = [
  body("roomId").isMongoId(),
  body("studentId").isMongoId(),
  body("fromDate").optional().isISO8601(),
  body("toDate").optional().isISO8601(),
  validate
];
export const listAlloc = asyncHandler(async (req, res) =>
  ok(res, await HostelAllocation.find({ instituteId: iid(req) }).populate("roomId studentId"))
);
export const createAlloc = asyncHandler(async (req, res) => {
  const room = await HostelRoom.findOne({ _id: req.body.roomId, instituteId: iid(req) });
  const student = await Student.findOne(notDeleted({ _id: req.body.studentId, instituteId: iid(req) }));
  if (!room || !student) return fail(res, 422, "Room and student required");
  const count = await HostelAllocation.countDocuments({ roomId: room._id });
  if (count >= room.capacity) return fail(res, 422, "Room at capacity");
  const doc = await HostelAllocation.create({
    instituteId: iid(req),
    roomId: room._id,
    studentId: student._id,
    fromDate: req.body.fromDate || Date.now(),
    toDate: req.body.toDate || null
  });
  await writeAudit(req, { action: "hostel.allocate", entity: "HostelAllocation", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const vehicles = crud(Vehicle, "transport");
export const vehicleValidators = [body("number").trim().notEmpty(), validate];
export const drivers = crud(Driver, "transport");
export const driverValidators = [body("name").trim().notEmpty(), validate];
export const routes = crud(TransportRoute, "transport");
export const routeValidators = [body("name").trim().notEmpty(), validate];
export const tassignValidators = [
  body("studentId").isMongoId(),
  body("routeId").isMongoId(),
  body("stop").optional().isString(),
  validate
];
export const listTAssign = asyncHandler(async (req, res) =>
  ok(res, await TransportAssignment.find({ instituteId: iid(req) }).populate("studentId routeId vehicleId"))
);
export const createTAssign = asyncHandler(async (req, res) => {
  const student = await Student.findOne(notDeleted({ _id: req.body.studentId, instituteId: iid(req) }));
  const route = await TransportRoute.findOne({ _id: req.body.routeId, instituteId: iid(req) });
  if (!student || !route) return fail(res, 422, "Student and route required");
  const doc = await TransportAssignment.create({
    instituteId: iid(req),
    studentId: student._id,
    routeId: route._id,
    vehicleId: req.body.vehicleId || null,
    stop: req.body.stop || ""
  });
  await writeAudit(req, { action: "transport.assign", entity: "TransportAssignment", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const listAudit = asyncHandler(async (req, res) => {
  const filter = {};
  // Super admins get a platform-wide view (all institutes) by default. They can
  // still narrow down to one institute via ?instituteId=. Regular institute users
  // are always scoped to their own institute and cannot see other institutes' logs.
  if (req.isSuperAdmin) {
    if (req.query.instituteId) filter.instituteId = req.query.instituteId;
  } else {
    filter.instituteId = req.institute._id;
  }
  if (req.query.q) filter.action = { $regex: req.query.q, $options: "i" };
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.entityId) filter.entityId = String(req.query.entityId);
  if (req.query.deleteReason) filter.deleteReason = { $regex: req.query.deleteReason, $options: "i" };
  const items = await AuditLog.find(filter)
    .populate("actorId")
    .populate("instituteId")
    .sort({ createdAt: -1 })
    .limit(200);
  return ok(res, items);
});

export const dashboardStats = asyncHandler(async (req, res) => {
  const instituteId = iid(req);
  const [students, employees, todayAtt] = await Promise.all([
    StudentModel.countDocuments(notDeleted({ instituteId })),
    Employee.countDocuments(notDeleted({ instituteId })),
    AttendanceDay.countDocuments({ instituteId, date: new Date().toISOString().slice(0, 10) })
  ]);
  return ok(res, { students, employees, todayAttendance: todayAtt });
});
