import mongoose from "mongoose"; 
import { asyncHandler } from "../middleware/asyncHandler.js";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Division from "../models/Division.js";

// Generic CRUD helpers
const makeCrud = (Model) => ({
  list: asyncHandler(async (req, res) => {
    const items = await Model.find()
      .sort(Model.modelName === "Designation" ? { priority: 1 } : { name: 1 })
      .lean();
    res.json(items);
  }),
  get: asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  }),
  create: asyncHandler(async (req, res) => {
    const item = await Model.create(req.body);
    res.status(201).json(item);
  }),
  update: asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  }),
  remove: asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  }),
});

export const DepartmentCtrl = makeCrud(Department);
export const DivisionCtrl = makeCrud(Division);
export const DesignationCtrl = {
  ...makeCrud(Designation),
  reorder: asyncHandler(async (req, res) => {
    const { items } = req.body; // [{ id, priority }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    const ops = [];
    for (const it of items) {
      const { id, priority } = it || {};
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: `Invalid designation id: ${id}` });
      }
      const pr = Number(priority);
      if (!Number.isInteger(pr) || pr < 1) {
        return res.status(400).json({ error: `Invalid priority for id ${id}` });
      }
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: { $set: { priority: pr, updatedAt: new Date() } },
        },
      });
    }

    if (ops.length === 0) return res.json({ ok: true, updated: 0 });

    const result = await Designation.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, updated: result.modifiedCount ?? result.nModified ?? 0 });
  }),
};
