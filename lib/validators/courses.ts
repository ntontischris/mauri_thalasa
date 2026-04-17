import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Το χρώμα πρέπει να είναι hex, π.χ. #22c55e");

export const createCourseSchema = z.object({
  name: z.string().min(1, "Απαιτείται όνομα").max(50),
  color: hexColor.nullable().optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  color: hexColor.nullable().optional(),
});
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const deleteCourseSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteCourseInput = z.infer<typeof deleteCourseSchema>;

export const reorderCoursesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
export type ReorderCoursesInput = z.infer<typeof reorderCoursesSchema>;

export const assignCategoryCourseSchema = z.object({
  categoryId: z.string().uuid(),
  courseId: z.string().uuid().nullable(),
});
export type AssignCategoryCourseInput = z.infer<
  typeof assignCategoryCourseSchema
>;
