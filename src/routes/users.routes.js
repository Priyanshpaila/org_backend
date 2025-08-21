import { Router } from "express";
import {
  listUsers, getUser, createUser, updateUser,
  softDeleteUser, hardDeleteUser, getSubtree, roots,changeUserRole, updateMyProfile
} from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../validators/userSchemas.js";
import { CreateUserSchema, UpdateUserSchema, ChangeRoleSchema, UpdateMyProfileSchema } from "../validators/userSchemas.js";

const router = Router();

router.use(requireAuth);

router.patch("/me/profile", validateBody(UpdateMyProfileSchema), updateMyProfile);

router.get("/", listUsers);
router.get("/roots", roots);
router.get("/:id", getUser);
router.get("/:id/subtree", getSubtree);

// Admin+ create/update
router.post("/", requireRole("admin", "superadmin"), validateBody(CreateUserSchema), createUser);
router.patch("/:id", requireRole("admin", "superadmin"), validateBody(UpdateUserSchema), updateUser);

// Superadmin-only: change role (admin<->user only)
router.patch("/:id/role", requireRole("superadmin"), validateBody(ChangeRoleSchema), changeUserRole);

// Deletion
router.delete("/:id", requireRole("admin", "superadmin"), softDeleteUser);
router.delete("/:id/hard", requireRole("superadmin"), hardDeleteUser);

export default router;
