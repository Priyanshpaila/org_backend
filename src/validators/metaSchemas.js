import { z } from "zod";

export const CreateMetaSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional()
});

export const UpdateMetaSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional()
});

export const CreateDesignationSchema = z.object({
  name: z.string().min(1),
  priority: z.number().int().min(1),
  description: z.string().optional()
});

export const UpdateDesignationSchema = z.object({
  name: z.string().min(1).optional(),
  priority: z.number().int().min(1).optional(),
  description: z.string().optional()
});

export const ReorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
    priority: z.number().int().min(1)
  })).min(1)
});

export const validateMeta =
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
