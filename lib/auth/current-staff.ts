import type { SupabaseClient } from "@supabase/supabase-js";

export function extractStaffId(
  userMetadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!userMetadata) return null;
  const staffId = userMetadata.staff_id;
  if (typeof staffId !== "string") return null;
  return staffId.length > 0 ? staffId : null;
}

export async function getCurrentStaffId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return extractStaffId(user?.user_metadata as Record<string, unknown> | null);
}
