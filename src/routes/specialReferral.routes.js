// routes/specialReferrals.js
import express from "express";
import multer from "multer";
import SpecialReferral from "../models/SpecialReferral.js";
import { generateSnapshotPDF } from "../utils/snapshotPdf.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect everything in this router with JWT
router.use(requireAuth);

/** ---------------------------
 *  CREATE (multipart/form-data)
 * --------------------------- */
router.post(
  "/",
  upload.fields([
    { name: "personPhoto", maxCount: 1 },
    { name: "leftLogo", maxCount: 1 },
    { name: "rightLogo", maxCount: 1 },
    { name: "headHRSignature", maxCount: 1 },
    { name: "directorSignature", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const b = req.body;

      const toArr = (x) => {
        if (!x) return [];
        if (Array.isArray(x)) return x;
        try {
          const parsed = JSON.parse(x);
          return Array.isArray(parsed) ? parsed : [String(x)];
        } catch {
          return String(x)
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      };

      const doc = new SpecialReferral({
        personName: b.personName,
        designation: b.designation,
        grade: b.grade,
        dateOfJoining: b.dateOfJoining ? new Date(b.dateOfJoining) : undefined,
        serviceTenureText: b.serviceTenureText,
        dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : undefined,
        totalExperienceText: b.totalExperienceText,
        previousOrganization: b.previousOrganization,
        qualifications: toArr(b.qualifications),
        majorCertifications: toArr(b.majorCertifications),
        meritsForVerticalMovement: toArr(b.meritsForVerticalMovement),
        positionSummary: b.positionSummary,
        additionalCommentsHeadHR: b.additionalCommentsHeadHR,
        commentsDirectorsOrMD: b.commentsDirectorsOrMD,
        finalDecisionTaken: b.finalDecisionTaken,
        presentedOn: b.presentedOn ? new Date(b.presentedOn) : undefined,
        headHRName: b.headHRName,
        directorOrMDName: b.directorOrMDName,
        // FIX: middleware sets req.user.id (string)
        createdBy: req.user?.id,
      });

      // attach uploaded images from memory if present
      const attach = (field) => {
        const f = req.files?.[field]?.[0];
        if (f) {
          doc[field] = {
            data: f.buffer,
            contentType: f.mimetype,
            filename: f.originalname,
          };
        }
      };
      ["personPhoto", "leftLogo", "rightLogo", "headHRSignature", "directorSignature"].forEach(attach);

      await doc.save();
      res.json({ id: doc._id });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message || "Failed to create record" });
    }
  }
);

/** ---------------------------
 *  LIST
 *  GET /special-referrals?q=&page=&limit=
 * --------------------------- */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
    const q = (req.query.q || "").trim();

    const filter = {};
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { personName: rx },
        { designation: rx },
        { grade: rx },
        { previousOrganization: rx },
        { headHRName: rx },
        { directorOrMDName: rx },
      ];
    }

    const [total, items] = await Promise.all([
      SpecialReferral.countDocuments(filter),
      SpecialReferral.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("personName designation grade previousOrganization presentedOn createdAt updatedAt"),
    ]);

    res.json({
      items,
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list records" });
  }
});

/** ---------------------------
 *  GET one (json)
 * --------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const doc = await SpecialReferral.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch {
    res.status(400).json({ error: "Invalid id" });
  }
});

/** ---------------------------
 *  Serve an individual image field
 *  GET /:id/image/:field
 * --------------------------- */
router.get("/:id/image/:field", async (req, res) => {
  try {
    const { id, field } = req.params;
    const allowed = new Set(["personPhoto", "leftLogo", "rightLogo", "headHRSignature", "directorSignature"]);
    if (!allowed.has(field)) return res.status(400).json({ error: "Invalid field" });

    const doc = await SpecialReferral.findById(id).select(field);
    const blob = doc?.[field];
    if (!doc || !blob?.data) return res.status(404).end();

    res.setHeader("Content-Type", blob.contentType || "application/octet-stream");
    res.send(blob.data);
  } catch {
    res.status(400).json({ error: "Invalid id" });
  }
});

/** ---------------------------
 *  Generate the PDF
 *  GET /:id/pdf?download=1
 * --------------------------- */
router.get("/:id/pdf", async (req, res) => {
  try {
    const doc = await SpecialReferral.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });

    let pdf = await generateSnapshotPDF(doc);

    // normalize to Buffer
    if (pdf && typeof pdf.pipe === "function") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        (req.query.download ? "attachment" : "inline") + `; filename="profile-snapshot-${doc._id}.pdf"`
      );
      return pdf.pipe(res);
    }
    if (pdf instanceof Uint8Array && !Buffer.isBuffer(pdf)) {
      pdf = Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength);
    } else if (typeof pdf === "string") {
      const base64 = pdf.startsWith("data:") ? pdf.split(",")[1] : pdf;
      pdf = Buffer.from(base64, "base64");
    }
    if (!Buffer.isBuffer(pdf)) {
      return res.status(500).json({ error: "PDF generator did not return a valid PDF" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      (req.query.download ? "attachment" : "inline") + `; filename="profile-snapshot-${doc._id}.pdf"`
    );
    res.setHeader("Content-Length", String(pdf.length));
    res.end(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to render PDF" });
  }
});

export default router;
