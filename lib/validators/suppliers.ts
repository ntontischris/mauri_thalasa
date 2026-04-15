import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  categories: z
    .array(
      z.enum([
        "seafood",
        "meat",
        "vegetables",
        "dairy",
        "dry",
        "beverages",
        "other",
      ]),
    )
    .default([]),
  afm: z.string().max(20).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const createSupplierOrderSchema = z.object({
  supplier_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        ingredient_id: z.string().uuid(),
        quantity: z.number().min(0.01),
        estimated_cost: z.number().min(0),
      }),
    )
    .min(1, "Προσθέστε τουλάχιστον ένα είδος"),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreateSupplierOrderInput = z.infer<
  typeof createSupplierOrderSchema
>;
