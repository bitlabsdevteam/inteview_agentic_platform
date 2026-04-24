"use server";

import { parseAccountRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

import {
  beginGoogleOAuth,
  buildAuthErrorRedirectPath
} from "@/lib/auth/google-oauth";
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

function getRegistrationSiteUrl() {
  return getPublicEnv().siteUrl;
}

async function createSignUpHandler() {
  const supabase = await createSupabaseServerClient();

  return async (payload: Parameters<typeof supabase.auth.signUp>[0]) => supabase.auth.signUp(payload);
}

async function createGoogleOAuthHandler() {
  const supabase = await createSupabaseServerClient();

  return async (payload: Parameters<typeof supabase.auth.signInWithOAuth>[0]) =>
    supabase.auth.signInWithOAuth(payload);
}

export async function submitRegistration(
  _previousState: RegisterUserResult,
  formData: FormData
): Promise<RegisterUserResult> {
  const role = getFormValue(formData, "role");
  const signUp = await createSignUpHandler();
  const result = await registerUser(
    {
      confirmPassword: getFormValue(formData, "confirmPassword"),
      email: getFormValue(formData, "email"),
      password: getFormValue(formData, "password"),
      role
    },
    {
      signUp,
      siteUrl: getRegistrationSiteUrl()
    }
  );

  if (result.status === "success" && result.redirectTo) {
    redirect(result.redirectTo);
  }

  return result;
}

export async function startGoogleRegistration(formData: FormData) {
  const role = getFormValue(formData, "role");
  const parsedRole = parseAccountRole(role.trim());

  const signInWithOAuth = await createGoogleOAuthHandler();
  const oauthResult = await beginGoogleOAuth({
    intent: "register",
    role: parsedRole ?? role,
    signInWithOAuth,
    siteUrl: getRegistrationSiteUrl()
  });

  if (oauthResult.status === "error") {
    redirect(
      buildAuthErrorRedirectPath({
        intent: "register",
        message: oauthResult.message,
        role
      })
    );
  }

  redirect(oauthResult.url);
}
