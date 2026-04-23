"use server";

import { getPublicEnv } from "@/lib/env";
import {
  registerUser,
  type RegisterUserResult
} from "@/lib/auth/register-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FormValueKey = "email" | "password" | "confirmPassword" | "role";

function getFormValue(formData: FormData, key: FormValueKey) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function useMockAuth() {
  return process.env.INTERVIEW_AGENT_MOCK_AUTH === "true";
}

function getRegistrationSiteUrl() {
  if (useMockAuth()) {
    return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://127.0.0.1:3000";
  }

  return getPublicEnv().siteUrl;
}

async function createSignUpHandler() {
  if (useMockAuth()) {
    return async ({ email }: { email: string }) => {
      if (email === "already-taken@example.com") {
        return {
          error: {
            message: "User already registered"
          }
        };
      }

      return {
        error: null
      };
    };
  }

  const supabase = await createSupabaseServerClient();

  return async (payload: Parameters<typeof supabase.auth.signUp>[0]) => supabase.auth.signUp(payload);
}

export async function submitRegistration(
  _previousState: RegisterUserResult,
  formData: FormData
): Promise<RegisterUserResult> {
  const signUp = await createSignUpHandler();

  return registerUser(
    {
      confirmPassword: getFormValue(formData, "confirmPassword"),
      email: getFormValue(formData, "email"),
      password: getFormValue(formData, "password"),
      role: getFormValue(formData, "role")
    },
    {
      signUp,
      siteUrl: getRegistrationSiteUrl()
    }
  );
}
