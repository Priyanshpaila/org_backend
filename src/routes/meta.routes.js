import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { DepartmentCtrl, DivisionCtrl, DesignationCtrl } from "../controllers/metaController.js";
import {
  validateMeta,
  CreateMetaSchema, UpdateMetaSchema,
  CreateDesignationSchema, UpdateDesignationSchema,
  ReorderSchema
} from "../validators/metaSchemas.js";

const router = Router();
router.use(requireAuth);

// READ
router.get("/departments", DepartmentCtrl.list);
router.get("/divisions", DivisionCtrl.list);
router.get("/designations", DesignationCtrl.list);

// IMPORTANT: put fixed routes BEFORE any :id routes
router.patch(
  "/designations/reorder",
  requireRole("superadmin"),
  validateMeta(ReorderSchema),
  DesignationCtrl.reorder
);

// READ by id (restrict :id to 24-hex)
router.get("/departments/:id([0-9a-fA-F]{24})", DepartmentCtrl.get);
router.get("/divisions/:id([0-9a-fA-F]{24})", DivisionCtrl.get);
router.get("/designations/:id([0-9a-fA-F]{24})", DesignationCtrl.get);

// CREATE (admin+)
router.post("/departments", requireRole("admin", "superadmin"), validateMeta(CreateMetaSchema), DepartmentCtrl.create);
router.post("/divisions", requireRole("admin", "superadmin"), validateMeta(CreateMetaSchema), DivisionCtrl.create);
router.post("/designations", requireRole("admin", "superadmin"), validateMeta(CreateDesignationSchema), DesignationCtrl.create);

// UPDATE (admin+)
router.patch("/departments/:id([0-9a-fA-F]{24})", requireRole("admin", "superadmin"), validateMeta(UpdateMetaSchema), DepartmentCtrl.update);
router.patch("/divisions/:id([0-9a-fA-F]{24})", requireRole("admin", "superadmin"), validateMeta(UpdateMetaSchema), DivisionCtrl.update);
router.patch("/designations/:id([0-9a-fA-F]{24})", requireRole("admin", "superadmin"), validateMeta(UpdateDesignationSchema), DesignationCtrl.update);

// DELETE
router.delete("/departments/:id([0-9a-fA-F]{24})", requireRole("admin", "superadmin"), DepartmentCtrl.remove);
router.delete("/divisions/:id([0-9a-fA-F]{24})", requireRole("admin", "superadmin"), DivisionCtrl.remove);
router.delete("/designations/:id([0-9a-fA-F]{24})", requireRole("admin", "superadmin"), DesignationCtrl.remove);

export default router;
