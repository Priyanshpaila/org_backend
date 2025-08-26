import mongoose from "mongoose";

const ImgSchema = new mongoose.Schema(
  {
    data: Buffer,                // store image bytes in the document
    contentType: String,         // e.g. "image/png"
    filename: String,            // optional
  },
  { _id: false }
);

const SpecialReferralSchema = new mongoose.Schema(
  {
    // Who is the person?
    personName: { type: String, required: true, trim: true },
    designation: { type: String, default: "" },
    grade: { type: String, default: "" },

    dateOfJoining: { type: Date },                 // used to compute tenure if you like
    serviceTenureText: { type: String, default: "" }, // free text like "4 yrs 8 mos"

    dateOfBirth: { type: Date },
    // age will be computed for the PDF; keep dob only (cleaner & single source of truth)

    totalExperienceText: { type: String, default: "" }, // e.g. "9 yrs domain, 12 yrs industry"

    previousOrganization: { type: String, default: "" },

    qualifications: { type: [String], default: [] },      // array for multiple degrees
    majorCertifications: { type: [String], default: [] }, // array

    meritsForVerticalMovement: { type: [String], default: [] }, // bullets

    positionSummary: { type: String, default: "" },

    // right column blocks
    additionalCommentsHeadHR: { type: String, default: "" },
    commentsDirectorsOrMD: { type: String, default: "" },
    finalDecisionTaken: { type: String, default: "" },

    // footer
    presentedOn: { type: Date },  // "Presented by HR on dd-mm-yyyy"

    // signatures / names (optional)
    headHRName: { type: String, default: "" },
    directorOrMDName: { type: String, default: "" },

    // IMAGES stored in Mongo
    personPhoto: ImgSchema,     // photo in the square top-left (your request)
    leftLogo: ImgSchema,        // the "HIRA" area (optional – can be static)
    rightLogo: ImgSchema,       // the "RR ISPAT" area (optional)
    headHRSignature: ImgSchema, // if you want signatures at the bottom (optional)
    directorSignature: ImgSchema,

    // audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// helper (age in years) – used during PDF render if dateOfBirth present
SpecialReferralSchema.methods.getAgeYears = function () {
  if (!this.dateOfBirth) return "";
  const dob = new Date(this.dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return String(age);
};

export default mongoose.model("SpecialReferral", SpecialReferralSchema);
