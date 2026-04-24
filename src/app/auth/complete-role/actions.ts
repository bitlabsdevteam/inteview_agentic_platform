"use server";

import { redirect } from "next/navigation";

import { getRoleDestination, parseAccountRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompleteRoleResult = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: {
    role?: string;
  };
};

export async function submitRoleCompletion(
  _previousState: CompleteRoleResult,
  formData: FormData
): Promise<CompleteRoleResult> {
  const role = parseAccountRole(
    typeof formData.get("role") === "string" ? (formData.get("role") as string) : ""
  );

  if (!role) {
    return {
      fieldErrors: {
        role: "Choose Employer or Job Seeker before continuing."
      },
      message: "Choose Employer or Job Seeker before continuing.",
      status: "error"
    };
  }

  const supabase = await createSupabaseServerClient();
  const updateResult = await supabase.auth.updateUser({
    data: {
      role
    }
  });

  if (updateResult.error) {
    return {
      message: updateResult.error.message.trim() || "We could not save your role right now.",
      status: "error"
    };
  }

  redirect(getRoleDestination(role));
}
