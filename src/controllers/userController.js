import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Designation from "../models/Designation.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { paginateParams } from "../utils/http.js";
import mongoose from "mongoose";

export const listUsers = asyncHandler(async (req, res) => {
  const { q, status, role, department, designation, division } = req.query;
  const { skip, limit, page } = paginateParams(req);
  const match = { isDeleted: false };

  if (q) {
    match.$or = [
      { name: { $regex: q, $options: "i" } },
      { empId: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } }
    ];
  }
  if (status) match.status = status;
  if (role) match.role = role;
  if (department) match.department = department;
  if (designation) match.designation = designation;
  if (division) match.division = division;

  const [items, total] = await Promise.all([
    User.find(match)
      .populate("department designation division reportingTo", "name priority empId")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(match)
  ]);

  res.json({ page, limit, total, items });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate("department designation division reportingTo", "name priority empId")
    .lean();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

export const createUser = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 12);
    delete data.password;
  }
  data.createdBy = req.user.id;
  const user = await User.create(data);
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 12);
    delete data.password;
  }
  data.updatedBy = req.user.id;
  const user = await User.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true
  });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

export const softDeleteUser = asyncHandler(async (req, res) => {
  const u = await User.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
  if (!u) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export const hardDeleteUser = asyncHandler(async (req, res) => {
  const u = await User.findByIdAndDelete(req.params.id);
  if (!u) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// returns user + all reports under them (optionally cap depth)
export const getSubtree = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cap = req.query.depth ? parseInt(req.query.depth, 10) : undefined;

  const root = await User.findById(id).lean();
  if (!root) return res.status(404).json({ error: "Root not found" });

  const match = { isDeleted: false, $or: [{ _id: new mongoose.Types.ObjectId(id) }, { ancestors: id }] };
  let list = await User.find(match)
    .populate("designation department division reportingTo", "name priority empId")
    .lean();

  if (cap !== undefined) {
    const maxDepth = root.depth + cap;
    list = list.filter(u => u.depth <= maxDepth);
  }
  res.json(list);
});

// Sort users by designation priority (for main tree siblings order)
export const roots = asyncHandler(async (req, res) => {
  const tops = await User.find({ isDeleted: false, $or: [{ reportingTo: { $size: 0 } }, { reportingTo: { $exists: false } }] })
    .populate("designation department division", "name priority")
    .lean();

  const designations = await Designation.find().lean();
  const map = new Map(designations.map(d => [String(d._id), d.priority]));

  tops.sort((a, b) => (map.get(String(a.designation?._id)) || 999) - (map.get(String(b.designation?._id)) || 999));
  res.json(tops);
});


// --- SUPERADMIN: change user role to 'admin' or 'user' only ---
export const changeUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // must be 'admin' or 'user'

  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin' or 'user'" });
  }

  const target = await User.findById(id);
  if (!target) return res.status(404).json({ error: "User not found" });

  // Never allow setting/keeping superadmin via this endpoint
  if (target.role === "superadmin") {
    return res.status(403).json({ error: "Cannot change role of a superadmin here" });
  }

  target.role = role;
  target.updatedBy = req.user.id;
  await target.save();

  const safe = await User.findById(target._id).lean();
  res.json({ ok: true, user: safe });
});

// --- LOGGED-IN USER: update own profile (safe fields only) ---
export const updateMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // whitelist: only allow these fields to be changed by the user
  const { name, phone, email } = req.body;
  const updates = {};
  if (typeof name === "string") updates.name = name;
  if (typeof phone === "string") updates.phone = phone;
  if (typeof email === "string") updates.email = email.toLowerCase();

  // prevent empty body
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No updatable fields provided" });
  }

  // enforce unique email/phone if changed
  if (updates.email) {
    const exists = await User.findOne({ _id: { $ne: userId }, email: updates.email }).lean();
    if (exists) return res.status(409).json({ error: "Email already in use" });
  }
  if (updates.phone) {
    const exists = await User.findOne({ _id: { $ne: userId }, phone: updates.phone }).lean();
    if (exists) return res.status(409).json({ error: "Phone already in use" });
  }

  updates.updatedBy = userId;

  const updated = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true
  }).lean();

  if (!updated) return res.status(404).json({ error: "User not found" });
  res.json(updated);
});
