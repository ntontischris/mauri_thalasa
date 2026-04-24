import { z } from "zod";

export const addOrderItemSchema = z.object({
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
  station: z.enum(["hot", "cold", "bar", "dessert"]),
  notes: z.string().max(500).optional(),
  course: z.number().int().min(1).default(1),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().uuid(),
        name: z.string(),
        price: z.number().min(0),
      }),
    )
    .optional(),
});

export const updateItemQuantitySchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const updateItemStatusSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(["pending", "preparing", "ready", "served"]),
});

export const completeOrderSchema = z.object({
  orderId: z.string().uuid(),
  tableId: z.string().uuid(),
  paymentMethod: z.enum(["cash", "card"]),
  tipAmount: z.number().min(0).default(0),
  loyaltyDiscount: z.number().min(0).default(0),
  rewardId: z.string().uuid().nullable().optional(),
});

export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateItemQuantityInput = z.infer<typeof updateItemQuantitySchema>;
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;
export type CompleteOrderInput = z.infer<typeof completeOrderSchema>;

export const sendCourseSchema = z.object({
  orderId: z.string().uuid(),
  courseNumber: z.number().int().min(1).max(10),
});
export type SendCourseInput = z.infer<typeof sendCourseSchema>;

export const advanceCourseSchema = z.object({
  orderId: z.string().uuid(),
  newActiveCourse: z.number().int().min(1).max(10),
});
export type AdvanceCourseInput = z.infer<typeof advanceCourseSchema>;

export const toggleRushSchema = z.object({
  orderId: z.string().uuid(),
  isRush: z.boolean(),
});
export type ToggleRushInput = z.infer<typeof toggleRushSchema>;
