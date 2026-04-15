import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(200),
  unit: z.enum(["kg", "lt", "pcs", "gr", "ml"]),
  current_stock: z.number().min(0).default(0),
  min_stock: z.number().min(0).default(0),
  cost_per_unit: z.number().min(0).default(0),
  supplier_id: z.string().uuid().optional().nullable(),
  category: z.enum([
    "seafood",
    "meat",
    "vegetables",
    "dairy",
    "dry",
    "beverages",
    "other",
  ]),
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const updateStockSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number(),
});

export const recordWasteSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.number().min(0.01, "Η ποσότητα πρέπει να είναι θετική"),
  reason: z.enum(["expired", "damaged", "overproduction", "other"]),
  notes: z.string().max(500).optional(),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type RecordWasteInput = z.infer<typeof recordWasteSchema>;
