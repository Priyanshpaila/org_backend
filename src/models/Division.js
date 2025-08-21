import mongoose from "mongoose";

const divisionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, sparse: true }
  },
  { timestamps: true }
);

export default mongoose.model("Division", divisionSchema);
