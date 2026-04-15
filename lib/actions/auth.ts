"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function ensureStaffAccount(
  staffId: string,
  staffName: string,
  role: string,
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  const email = `${staffId}@eatflow.local`;

  // Create user with auto-confirm (bypasses email verification)
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: {
      staff_id: staffId,
      staff_name: staffName,
      role,
    },
  });

  // Ignore "already registered" - that's fine
  if (error && !error.message.includes("already been registered")) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
