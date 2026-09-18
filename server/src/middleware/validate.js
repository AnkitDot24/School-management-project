import { validationResult } from "express-validator";
import { fail } from "../utils/apiResponse.js";

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return fail(res, 400, "Validation failed", errors);
}
