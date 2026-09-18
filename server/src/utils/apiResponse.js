export function ok(res, data = null, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data, errors: null });
}

export function created(res, data = null, message = "Created") {
  return ok(res, data, message, 201);
}

export function fail(res, status, message, errors = null) {
  return res.status(status).json({ success: false, message, data: null, errors });
}
