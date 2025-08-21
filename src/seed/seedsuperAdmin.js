import "dotenv/config.js";
import { connectDB } from "../config/db.js";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

(async () => {
  await connectDB();
  const name = process.env.SEED_SUPERADMIN_NAME || "System SuperAdmin";
  const empId = process.env.SEED_SUPERADMIN_EMP_ID || "EMP-0001";
  const email = process.env.SEED_SUPERADMIN_EMAIL || "superadmin@example.com";
  const password = process.env.SEED_SUPERADMIN_PASSWORD || "ChangeMe123!";

  const existing = await User.findOne({ $or: [{ empId }, { email }] });
  if (existing) {
    console.log("Superadmin already exists");
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 12);
  await User.create({
    name,
    empId,
    email,
    passwordHash: hash,
    dateOfJoining: new Date(),
    role: "superadmin",
    status: "active",
    reportingTo: []
  });

  console.log("Superadmin created:", { name, empId, email });
  process.exit(0);
})();
