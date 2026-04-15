import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(200),
  price: z.number().min(0, "Η τιμή δεν μπορεί να είναι αρνητική"),
  category_id: z.string().uuid("Μη έγκυρη κατηγορία"),
  code: z.string().max(50).optional(),
  name_alt: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  vat_rate: z.number().min(0).max(100).default(24),
  available: z.boolean().default(true),
  station: z.enum(["hot", "cold", "bar", "dessert"]).default("hot"),
  sort_order: z.number().int().default(0),
  cost_price: z.number().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(100),
  sort_order: z.number().int().default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
