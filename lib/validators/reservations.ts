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

export const createPublicReservationSchema = z.object({
  guest_name: z
    .string()
    .trim()
    .min(2, "Το ονοματεπώνυμο είναι υποχρεωτικό")
    .max(120),
  guest_phone: z
    .string()
    .trim()
    .min(6, "Το τηλέφωνο είναι υποχρεωτικό")
    .max(30),
  guest_email: z
    .string()
    .trim()
    .email("Μη έγκυρο email")
    .max(160)
    .optional()
    .or(z.literal("")),
  party_size: z.number().int().min(1).max(8),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationStatusInput = z.infer<
  typeof updateReservationStatusSchema
>;
export type AddToWaitlistInput = z.infer<typeof addToWaitlistSchema>;
export type CreatePublicReservationInput = z.infer<
  typeof createPublicReservationSchema
>;
