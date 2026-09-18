import { body, param } from "express-validator";
import {
  FeeStructure,
  FeeComponent,
  BILLING_CYCLES
} from "../models/FeeStructure.js";
import { ok, created, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { validate } from "../middleware/validate.js";

const iid = (req) => req.institute._id;

export const structureValidators = [
  body("name").trim().notEmpty(),
  body("billingCycle").isIn(BILLING_CYCLES),
  body("academicYearId").optional({ nullable: true }).isMongoId(),
  body("code").optional().trim(),
  body("description").optional().trim(),
  validate
];

export const listStructures = asyncHandler(async (req, res) => {
  const filter = { instituteId: iid(req) };
  if (req.query.active === "true") filter.isActive = true;
  if (req.query.active === "false") filter.isActive = false;
  const items = await FeeStructure.find(filter).populate("academicYearId").sort({ name: 1 });
  return ok(res, items);
});

export const createStructure = asyncHandler(async (req, res) => {
  const doc = await FeeStructure.create({
    instituteId: iid(req),
    name: req.body.name,
    code: req.body.code || "",
    academicYearId: req.body.academicYearId || null,
    billingCycle: req.body.billingCycle,
    description: req.body.description || "",
    isActive: req.body.isActive !== false
  });
  await writeAudit(req, { action: "fees.structure.create", entity: "FeeStructure", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const getStructure = asyncHandler(async (req, res) => {
  const doc = await FeeStructure.findOne({ _id: req.params.id, instituteId: iid(req) }).populate("academicYearId");
  if (!doc) return fail(res, 404, "Fee structure not found");
  return ok(res, doc);
});

export const updateStructure = asyncHandler(async (req, res) => {
  const doc = await FeeStructure.findOne({ _id: req.params.id, instituteId: iid(req) });
  if (!doc) return fail(res, 404, "Fee structure not found");
  const before = doc.toObject();
  for (const k of ["name", "code", "description", "billingCycle", "isActive"]) {
    if (req.body[k] !== undefined) doc[k] = req.body[k];
  }
  if (req.body.academicYearId !== undefined) doc.academicYearId = req.body.academicYearId || null;
  await doc.save();
  await writeAudit(req, { action: "fees.structure.update", entity: "FeeStructure", entityId: doc._id, before, after: doc });
  return ok(res, doc);
});

export const listComponents = asyncHandler(async (req, res) => {
  const structure = await FeeStructure.findOne({ _id: req.params.id, instituteId: iid(req) });
  if (!structure) return fail(res, 404, "Fee structure not found");
  const items = await FeeComponent.find({ feeStructureId: structure._id, instituteId: iid(req) }).sort({
    sortOrder: 1,
    name: 1
  });
  return ok(res, items);
});

export const componentValidators = [
  body("name").trim().notEmpty(),
  body("amount").isFloat({ min: 0 }),
  body("code").optional().trim(),
  body("sortOrder").optional().isInt({ min: 0 }),
  validate
];

export const addComponent = asyncHandler(async (req, res) => {
  const structure = await FeeStructure.findOne({ _id: req.params.id, instituteId: iid(req) });
  if (!structure) return fail(res, 404, "Fee structure not found");
  const doc = await FeeComponent.create({
    instituteId: iid(req),
    feeStructureId: structure._id,
    name: req.body.name,
    code: req.body.code || "",
    amount: Number(req.body.amount),
    sortOrder: Number(req.body.sortOrder || 0),
    isActive: true
  });
  await writeAudit(req, { action: "fees.structure.update", entity: "FeeComponent", entityId: doc._id, after: doc });
  return created(res, doc);
});

export const updateComponent = asyncHandler(async (req, res) => {
  const doc = await FeeComponent.findOne({ _id: req.params.id, instituteId: iid(req) });
  if (!doc) return fail(res, 404, "Fee component not found");
  const before = doc.toObject();
  for (const k of ["name", "code", "amount", "sortOrder", "isActive"]) {
    if (req.body[k] !== undefined) doc[k] = req.body[k];
  }
  await doc.save();
  await writeAudit(req, { action: "fees.structure.update", entity: "FeeComponent", entityId: doc._id, before, after: doc });
  return ok(res, doc);
});

export const deactivateComponent = asyncHandler(async (req, res) => {
  const doc = await FeeComponent.findOne({ _id: req.params.id, instituteId: iid(req) });
  if (!doc) return fail(res, 404, "Fee component not found");
  doc.isActive = false;
  await doc.save();
  return ok(res, doc, "Component deactivated");
});

export const structureIdParam = [param("id").isMongoId(), validate];
export const componentIdParam = [param("id").isMongoId(), validate];
