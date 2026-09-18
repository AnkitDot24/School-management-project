import { fail } from "../utils/apiResponse.js";

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 11000) {
    return fail(res, 409, "Duplicate record", [{ message: "A record with this unique value already exists" }]);
  }
  if (err.name === "ValidationError") {
    return fail(res, 422, "Business validation failed", [{ message: err.message }]);
  }
  if (err.status) return fail(res, err.status, err.message);
  return fail(res, 500, "Internal server error");
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
