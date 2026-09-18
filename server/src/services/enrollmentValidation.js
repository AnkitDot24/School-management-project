import { ClassModel, Section, AcademicYear, Employee, User, Student } from "../models/index.js";
import { notDeleted } from "../utils/softDelete.js";
import { httpError } from "../middleware/errorHandler.js";

export async function validateStudentEnrollment(instituteId, body, existing = null) {
  const classId = body.classId !== undefined ? body.classId : existing?.classId;
  const sectionId = body.sectionId !== undefined ? body.sectionId : existing?.sectionId;
  const academicYearId = body.academicYearId !== undefined ? body.academicYearId : existing?.academicYearId;

  if (academicYearId) {
    const year = await AcademicYear.findOne({ _id: academicYearId, instituteId });
    if (!year) throw httpError(422, "Academic year not in this institute");
  }
  if (classId) {
    const cls = await ClassModel.findOne({ _id: classId, instituteId });
    if (!cls) throw httpError(422, "Class not in this institute");
    if (academicYearId && String(cls.academicYearId) !== String(academicYearId)) {
      throw httpError(422, "Class does not belong to the selected academic year");
    }
  }
  if (sectionId) {
    const sec = await Section.findOne({ _id: sectionId, instituteId });
    if (!sec) throw httpError(422, "Section not in this institute");
    if (classId && String(sec.classId) !== String(classId)) {
      throw httpError(422, "Section does not belong to class");
    }
    if (!classId) throw httpError(422, "Class is required when section is set");
  }
}

export async function validateEmployeeUserLink(instituteId, userId, excludeEmployeeId = null) {
  if (!userId) return;
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw httpError(422, "User not found or inactive");
  const filter = { instituteId, userId, isDeleted: { $ne: true } };
  if (excludeEmployeeId) filter._id = { $ne: excludeEmployeeId };
  const taken = await Employee.findOne(filter);
  if (taken) throw httpError(409, "User is already linked to another employee in this institute");
}

export function eligibleTeacherQuery(instituteId) {
  return notDeleted({ instituteId, type: "teacher", isActive: true });
}

export async function getEligibleTeacherById(instituteId, teacherId) {
  return Employee.findOne({ ...eligibleTeacherQuery(instituteId), _id: teacherId });
}

export async function resolveLinkedStudent(user, instituteId) {
  const or = [{ userId: user._id }];
  if (user.studentId) or.push({ _id: user.studentId });
  return Student.findOne(notDeleted({ instituteId, $or: or })).populate("classId sectionId academicYearId");
}
