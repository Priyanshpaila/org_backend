import mongoose from "mongoose";

const designationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // Lower number => higher rank
    priority: { type: Number, required: true, index: true },
    description: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("Designation", designationSchema);
