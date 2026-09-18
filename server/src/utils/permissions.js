/** True when request may perform action (Super Admin or explicit / wildcard permission). */
export function hasPermission(req, key) {
  if (req.isSuperAdmin) return true;
  const perms = req.effectivePermissions;
  if (!perms?.length) return false;
  if (perms.includes("*")) return true;
  return perms.includes(key);
}
