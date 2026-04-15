import { z } from "zod";

export const createReservationSchema = z.object({
  guest_name: z.string().min(1, "Το όνομα είναι υποχρεωτικό"),
  guest_phone: z.string().optional(),
  guest_email: z.string().email().optional().or(z.literal("")),
  party_size: z.number().int().min(1).max(30),
  reservation_date: z.string(),
  reservation_time: z.string(),
  estimated_duration_minutes: z.number().int().default(90),
  table_id: z.string().uuid().optional().nullable(),
  zone_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional(),
  special_requests: z.string().max(500).optional(),
  occasion: z.string().optional(),
  customer_id: z.string().uuid().optional().nullable(),
});

export const updateReservationStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "pending",
    "confirmed",
    "seated",
    "completed",
    "cancelled",
    "no_show",
  ]),
  cancellation_reason: z.string().optional(),
});

export const addToWaitlistSchema = z.object({
  guest_name: z.string().min(1),
  guest_phone: z.string().optional(),
  party_size: z.number().int().min(1),
  estimated_wait_minutes: z.number().int().default(30),
  preferred_zone_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationStatusInput = z.infer<
  typeof updateReservationStatusSchema
>;
export type AddToWaitlistInput = z.infer<typeof addToWaitlistSchema>;
