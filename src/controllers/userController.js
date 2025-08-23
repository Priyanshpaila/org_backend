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

// --- helper: sort by designation priority then name
function sortByDesignationPriority(designationMap) {
  return (a, b) => {
    const pa = designationMap.get(String(a.designation?._id)) ?? 999;
    const pb = designationMap.get(String(b.designation?._id)) ?? 999;
    if (pa !== pb) return pa - pb;
    return (a.name || "").localeCompare(b.name || "");
  };
}

export const roots = asyncHandler(async (req, res) => {
  const includeMy =
    String(req.query.includeMyReports || "").toLowerCase() === "1" ||
    String(req.query.includeMyReports || "").toLowerCase() === "true";

  const wantFull =
    String(req.query.full || "").toLowerCase() === "1" ||
    String(req.query.full || "").toLowerCase() === "true";

  // at least depth 6 by default
  const depthCap = Number(req.query.depth) > 0 ? Number(req.query.depth) : 6;

  const userId = req.user?.id;

  const [topNodes, designations, myReportsRaw] = await Promise.all([
    // Top-level users (no managers)
    User.find({
      isDeleted: false,
      $or: [{ reportingTo: { $size: 0 } }, { reportingTo: { $exists: false } }],
    })
      .populate("designation department division", "name priority")
      .lean(),

    // sort map
    Designation.find().lean(),

    // Direct reports for the logged-in user (optional)
    includeMy && userId
      ? User.find({
          isDeleted: false,
          reportingTo: new mongoose.Types.ObjectId(userId),
        })
          .populate(
            "designation department division reportingTo",
            "name priority empId"
          )
          .lean()
      : Promise.resolve([]),
  ]);

  const dmap = new Map(designations.map((d) => [String(d._id), d.priority]));
  const sorter = sortByDesignationPriority(dmap);

  topNodes.sort(sorter);
  const myReports = (myReportsRaw || []).sort(sorter);

  // If caller doesn't want full forest, keep backward compatibility
  if (!wantFull) {
    if (!includeMy) return res.json(topNodes);
    return res.json({ roots: topNodes, myReports });
  }

  // Build the "forest" up to depthCap under all top nodes
  const rootIds = topNodes.map((r) => r._id);

  // Compute min root depth safely (supports fallback to ancestors length)
  const depthOf = (u) =>
    typeof u.depth === "number"
      ? u.depth
      : Array.isArray(u.ancestors)
      ? u.ancestors.length
      : 0;

  const minRootDepth = topNodes.length
    ? Math.min(...topNodes.map(depthOf))
    : 0;
  const maxDepth = minRootDepth + depthCap;

  // Query all nodes that belong to any of the top trees, up to the depth cap
  // - include the roots themselves
  // - include anyone whose ancestors contain a root id
  const forest = await User.find({
    isDeleted: false,
    $or: [
      { _id: { $in: rootIds } },
      { ancestors: { $in: rootIds } }, // array contains any root id
    ],
    // cap by depth; fall back to 0 if missing
    $expr: {
      $lte: [
        { $ifNull: ["$depth", { $size: { $ifNull: ["$ancestors", []] } }] },
        maxDepth,
      ],
    },
  })
    .populate(
      "designation department division reportingTo",
      "name priority empId"
    )
    .lean();

  // Optional: sort forest by (depth asc), then designation priority, then name
  forest.sort((a, b) => {
    const da = depthOf(a);
    const db = depthOf(b);
    if (da !== db) return da - db;
    return sorter(a, b);
  });

  return res.json({
    roots: topNodes,
    myReports,
    tree: forest, // <= use this on the frontend to draw edges
  });
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

  const { name, phone, email } = req.body;
  const updates = {};
  if (typeof name === "string") updates.name = name;
  if (typeof phone === "string") updates.phone = phone;
  if (typeof email === "string") updates.email = email.toLowerCase();

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No updatable fields provided" });
  }

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

/** OPTIONAL: dedicated endpoint if you want /users/my-reports */
export const myReports = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [designations, reports] = await Promise.all([
    Designation.find().lean(),
    User.find({ isDeleted: false, reportingTo: new mongoose.Types.ObjectId(userId) })
      .populate("designation department division reportingTo", "name priority empId")
      .lean()
  ]);

  const dmap = new Map(designations.map(d => [String(d._id), d.priority]));
  const sorter = sortByDesignationPriority(dmap);
  reports.sort(sorter);

  res.json(reports);
});
