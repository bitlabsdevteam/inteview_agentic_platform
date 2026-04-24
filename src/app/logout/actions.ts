"use server";

import { redirect } from "next/navigation";

import { logoutUser } from "@/lib/auth/logout-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function submitLogout() {
  const supabase = await createSupabaseServerClient();
  const result = await logoutUser({
    signOut: () => supabase.auth.signOut()
  });

  if (result.status === "error") {
    redirect(`/login?authError=${encodeURIComponent(result.message)}`);
  }

  redirect(result.redirectTo);
}
