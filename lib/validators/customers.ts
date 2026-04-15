import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό").max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email("Μη έγκυρο email").optional().or(z.literal("")),
  birthday: z.string().optional(),
  notes: z.string().max(1000).optional(),
  is_vip: z.boolean().default(false),
  allergies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  afm: z.string().max(20).optional(),
  discount: z.number().min(0).max(100).default(0),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
