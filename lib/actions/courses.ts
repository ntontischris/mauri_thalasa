"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
  reorderCoursesSchema,
  assignCategoryCourseSchema,
  type CreateCourseInput,
  type UpdateCourseInput,
  type DeleteCourseInput,
  type ReorderCoursesInput,
  type AssignCategoryCourseInput,
} from "@/lib/validators/courses";
import type { DbCourse } from "@/lib/types/database";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

function revalidateAll() {
  revalidatePath("/settings/courses");
  revalidatePath("/orders", "layout");
  revalidatePath("/kitchen");
}

export async function createCourse(
  input: CreateCourseInput,
): Promise<ActionResult<DbCourse>> {
  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  // Next sort_order = max + 1
  const { data: maxRow } = await supabase
    .from("courses")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("courses")
    .insert({
      name: parsed.data.name,
      sort_order: nextOrder,
      color: parsed.data.color ?? null,
    })
    .select("id, name, sort_order, color, created_at, updated_at")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidateAll();
  return { success: true, data };
}

export async function updateCourse(
  input: UpdateCourseInput,
): Promise<ActionResult> {
  const parsed = updateCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, name, color } = parsed.data;
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (color !== undefined) patch.color = color;

  if (Object.keys(patch).length === 0) {
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("courses").update(patch).eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία ενημέρωσης: ${error.message}` };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteCourse(
  input: DeleteCourseInput,
): Promise<ActionResult> {
  const parsed = deleteCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();
  // FK is ON DELETE SET NULL on categories.course_id, so assignments
  // just become unassigned (hidden from POS until re-assigned).
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: `Αποτυχία διαγραφής: ${error.message}` };
  }

  revalidateAll();
  return { success: true };
}

export async function reorderCourses(
  input: ReorderCoursesInput,
): Promise<ActionResult> {
  const parsed = reorderCoursesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  // Apply new sort_order = index + 1 for each id in the list.
  // Serialized updates — acceptable: list is small (rarely >10).
  for (let i = 0; i < parsed.data.orderedIds.length; i++) {
    const { error } = await supabase
      .from("courses")
      .update({ sort_order: i + 1 })
      .eq("id", parsed.data.orderedIds[i]);

    if (error) {
      return {
        success: false,
        error: `Αποτυχία αναδιάταξης: ${error.message}`,
      };
    }
  }

  revalidateAll();
  return { success: true };
}

export async function assignCategoryCourse(
  input: AssignCategoryCourseInput,
): Promise<ActionResult> {
  const parsed = assignCategoryCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("categories")
    .update({ course_id: parsed.data.courseId })
    .eq("id", parsed.data.categoryId);

  if (error) {
    return { success: false, error: `Αποτυχία ανάθεσης: ${error.message}` };
  }

  revalidateAll();
  return { success: true };
}
