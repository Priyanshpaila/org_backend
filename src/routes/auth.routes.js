import { Router } from "express";
import { signup, login  } from "../controllers/authController.js";
import { validate } from "../validators/authSchemas.js";
import { SignupSchema, LoginSchema } from "../validators/authSchemas.js";

const router = Router();

router.post("/signup", validate(SignupSchema), signup);
router.post("/login", validate(LoginSchema), login);


export default router;
