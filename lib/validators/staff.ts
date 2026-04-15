import { z } from "zod";

export const createStaffSchema = z.object({
  name: z.string().min(1, "Το όνομα είναι υποχρεωτικό"),
  role: z.enum(["waiter", "chef", "barman", "manager"]),
  pin: z.string().length(4, "Το PIN πρέπει να είναι 4 ψηφία"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export const updateStaffSchema = createStaffSchema.partial();

export const createShiftSchema = z.object({
  staff_id: z.string().uuid(),
  date: z.string(),
  type: z.enum(["morning", "afternoon", "off"]),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
