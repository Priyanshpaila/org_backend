import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signTokens } from "../utils/jwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import jwt from "jsonwebtoken";

// SIGNUP: only name, email, password; role forced to "user"
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // ensure unique email
  const exists = await User.findOne({ email: email.toLowerCase() }).lean();
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "user",            // force role
    status: "active",        // sane default
    reportingTo: []          // optional default
    // empId, department, designation, division, dateOfJoining, etc.
    // can be set later by an admin/superadmin via /users endpoints
  });

  const tokens = signTokens(user);
  const safeUser = await User.findById(user._id).lean();
  res.status(201).json({ user: safeUser, ...tokens });
});

// LOGIN: email + password (emailOrEmpId removed)
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select("+passwordHash");
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const tokens = signTokens(user);
  const safeUser = await User.findById(user._id).lean();
  res.json({ user: safeUser, ...tokens });
});


