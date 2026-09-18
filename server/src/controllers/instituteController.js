import { body, param } from "express-validator";
import { Institute } from "../models/index.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";
import { seedInstituteRoles } from "../rbac/instituteRoles.js";
import { notDeleted } from "../utils/softDelete.js";

export const createInstituteValidators = [
  body("name").trim().notEmpty(),
  body("code").trim().notEmpty(),
  validate
];

export const listInstitutes = asyncHandler(async (req, res) => {
  if (!req.user.isSuperAdmin) return fail(res, 403, "Platform access only");
  const q = req.query.q;
  const filter = notDeleted();
  if (q) filter.name = { $regex: q, $options: "i" };
  const items = await Institute.find(filter).sort({ createdAt: -1 });
  return ok(res, items);
});

export const createInstitute = asyncHandler(async (req, res) => {
  if (!req.user.isSuperAdmin) return fail(res, 403, "Only Super Admin can create institutes");
  const { name, code, address, phone, email } = req.body;
  const inst = await Institute.create({
    name,
    code: code.toUpperCase(),
    address: address || "",
    phone: phone || "",
    email: email || "",
    logoUrl: req.file ? `/uploads/${req.file.filename}` : "",
    createdBy: req.user._id
  });
  await seedInstituteRoles(inst._id);
  await writeAudit(req, { action: "institute.create", entity: "Institute", entityId: inst._id, after: inst, instituteId: inst._id });
  return created(res, inst);
});

export const getInstitute = asyncHandler(async (req, res) => {
  const inst = req.institute || (await Institute.findById(req.params.id));
  if (!inst) return fail(res, 404, "Institute not found");
  return ok(res, inst);
});

export const updateInstituteValidators = [
  param("id").optional(),
  body("name").optional().trim().notEmpty(),
  validate
];

export const updateInstitute = asyncHandler(async (req, res) => {
  const id = req.params.id || req.institute?._id;
  const inst = await Institute.findById(id);
  if (!inst) return fail(res, 404, "Institute not found");
  const before = inst.toObject();
  Object.assign(inst, {
    name: req.body.name ?? inst.name,
    address: req.body.address ?? inst.address,
    phone: req.body.phone ?? inst.phone,
    email: req.body.email ?? inst.email,
    isActive: req.body.isActive ?? inst.isActive
  });
  if (req.file) inst.logoUrl = `/uploads/${req.file.filename}`;
  await inst.save();
  await writeAudit(req, { action: "institute.update", entity: "Institute", entityId: inst._id, before, after: inst });
  return ok(res, inst);
});

export const softDeleteInstituteValidators = [
  param("id").isMongoId(),
  body("reason").trim().isLength({ min: 5 }),
  validate
];

export const softDeleteInstitute = asyncHandler(async (req, res) => {
  if (!req.user.isSuperAdmin) return fail(res, 403, "Only Super Admin can delete institutes");
  const inst = await Institute.findOne(notDeleted({ _id: req.params.id }));
  if (!inst) return fail(res, 404, "Institute not found");
  const before = inst.toObject();
  inst.isDeleted = true;
  inst.deletedAt = new Date();
  inst.deletedBy = req.user._id;
  inst.deleteReason = req.body.reason;
  inst.isActive = false;
  await inst.save();
  await writeAudit(req, {
    action: "institute.softDelete",
    entity: "Institute",
    entityId: inst._id,
    before,
    after: inst,
    deleteReason: req.body.reason,
    instituteId: inst._id
  });
  return ok(res, inst, "Institute soft-deleted");
});
