import { Permission, Role, RolePermission } from "../models/index.js";
import { PERMISSIONS, ROLE_DEFAULTS } from "./catalog.js";

export async function ensurePermissions() {
  for (const [key, module, description] of PERMISSIONS) {
    await Permission.updateOne({ key }, { $set: { key, module, description } }, { upsert: true });
  }
}

export async function seedInstituteRoles(instituteId) {
  await ensurePermissions();
  const allPerms = await Permission.find().lean();
  const byKey = Object.fromEntries(allPerms.map((p) => [p.key, p]));

  for (const [code, def] of Object.entries(ROLE_DEFAULTS)) {
    let role = await Role.findOne({ code, instituteId });
    if (!role) {
      role = await Role.create({ code, name: def.name, instituteId, isSystem: true });
    }
    for (const key of def.keys) {
      const perm = byKey[key];
      if (!perm) continue;
      await RolePermission.updateOne(
        { roleId: role._id, permissionId: perm._id },
        { $setOnInsert: { roleId: role._id, permissionId: perm._id } },
        { upsert: true }
      );
    }
  }
}
