import mongoose from "mongoose";

const ROLES = ["superadmin", "admin", "user"];
const STATUS = ["active", "inactive", "vacant", "on_leave"];

const userSchema = new mongoose.Schema(
  {
    // Identity
    name: { type: String, required: true, trim: true },
    empId: { type: String, unique: true, index: true },

    // Org structure
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: "Designation" },
    division: { type: mongoose.Schema.Types.ObjectId, ref: "Division" },

    // Dates
    dateOfJoining: { type: Date,},

    // Employment status
    status: { type: String, enum: STATUS, default: "active", index: true },

    // Reporting line (multi-manager allowed)
    reportingTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

    // Role in app (RBAC)
    role: { type: String, enum: ROLES, default: "user", index: true },

    // Auth
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },

    // Tree helpers (materialized path for fast subtree)
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    depth: { type: Number, default: 0, index: true },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Sync ancestors/depth using primary manager (first in reportingTo)
userSchema.pre("save", async function (next) {
  if (!this.isModified("reportingTo")) return next();

  if (!this.reportingTo || this.reportingTo.length === 0) {
    this.ancestors = [];
    this.depth = 0;
  } else {
    const primaryManager = this.reportingTo[0];
    const mgr = await this.model("User").findById(primaryManager).select("ancestors");
    if (!mgr) return next(new Error("Primary manager not found"));
    this.ancestors = [...mgr.ancestors, primaryManager];
    this.depth = this.ancestors.length;
  }
  next();
});

// Prevent self/circular
userSchema.pre("save", function (next) {
  if (this.ancestors?.some(id => String(id) === String(this._id))) {
    return next(new Error("Circular reporting relationship detected"));
  }
  next();
});

export default mongoose.model("User", userSchema);
export { ROLES, STATUS };
