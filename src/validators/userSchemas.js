import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(2),
  empId: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(8),
  department: z.string().optional(),
  designation: z.string().optional(),
  division: z.string().optional(),
  dateOfJoining: z.string().or(z.date()),
  status: z.enum(["active", "inactive", "terminated", "on_leave"]).optional(),
  role: z.enum(["superadmin", "admin", "user"]).optional(),
  reportingTo: z.array(z.string()).optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  empId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  division: z.string().optional(),
  dateOfJoining: z.string().or(z.date()).optional(),
  status: z.enum(["active", "inactive", "terminated", "on_leave"]).optional(),
  role: z.enum(["superadmin", "admin", "user"]).optional(),
  reportingTo: z.array(z.string()).optional(),
  isDeleted: z.boolean().optional(),
});

export const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    return res.status(400).json({ error: "Validation error", details: issues });
  }
  req.body = parsed.data;
  next();
};

export const ChangeRoleSchema = z.object({
  role: z.enum(["admin", "user"]),
});

export const UpdateMyProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(4).max(20).optional(),
  email: z.string().email().optional(),
});
