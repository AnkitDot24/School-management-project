import dotenv from "dotenv";
import { connectDb } from "./config/db.js";
import { createApp } from "./app.js";
import { User } from "./models/index.js";
import bcrypt from "bcryptjs";
import { ensurePermissions } from "./rbac/instituteRoles.js";

dotenv.config();

const port = process.env.PORT || 5000;

async function boot() {
  await connectDb();
  await ensurePermissions();
  const email = (process.env.SUPER_ADMIN_EMAIL || "admin@platform.com").toLowerCase();
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({
      name: "Platform Super Admin",
      email,
      passwordHash: await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || "Admin@123", 12),
      isSuperAdmin: true
    });
    console.log(`Bootstrapped super admin ${email}`);
  }
  const app = createApp();
  app.listen(port, () => console.log(`API listening on ${port}`));
}

boot().catch((err) => {
  console.error(err);
  process.exit(1);
});
