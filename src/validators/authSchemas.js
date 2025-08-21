import { z } from "zod";

// Only these 3 for signup
export const SignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

// Email-only login
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});



export const validate =
  (schema) =>
  (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
      return res.status(400).json({ error: "Validation error", details: issues });
    }
    req.body = parsed.data;
    next();
  };
