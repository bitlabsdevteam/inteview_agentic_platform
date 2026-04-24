"use server";

import { redirect } from "next/navigation";

import {
  beginGoogleOAuth,
  buildAuthErrorRedirectPath,
} from "@/lib/auth/google-oauth";
import { loginUser } from "@/lib/auth/login-user";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginFormValueKey = "email" | "password";

export type LoginFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

function getFormValue(formData: FormData, key: LoginFormValueKey) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getSiteUrl() {
  return getPublicEnv().siteUrl;
}

async function createGoogleOAuthHandler() {
  const supabase = await createSupabaseServerClient();

  return async (payload: Parameters<typeof supabase.auth.signInWithOAuth>[0]) =>
    supabase.auth.signInWithOAuth(payload);
}

async function createPasswordLoginHandler() {
  const supabase = await createSupabaseServerClient();

  return async (payload: Parameters<typeof supabase.auth.signInWithPassword>[0]) =>
    supabase.auth.signInWithPassword(payload);
}

export async function submitLogin(
  _previousState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const signInWithPassword = await createPasswordLoginHandler();
  const result = await loginUser(
    {
      email: getFormValue(formData, "email"),
      password: getFormValue(formData, "password")
    },
    {
      signInWithPassword
    }
  );

  if (result.status === "error") {
    return result;
  }

  redirect(result.redirectTo);
}

export async function startGoogleLogin() {
  const signInWithOAuth = await createGoogleOAuthHandler();
  const oauthResult = await beginGoogleOAuth({
    intent: "login",
    role: "",
    signInWithOAuth,
    siteUrl: getSiteUrl()
  });

  if (oauthResult.status === "error") {
    redirect(
      buildAuthErrorRedirectPath({
        intent: "login",
        message: oauthResult.message
      })
    );
  }

  redirect(oauthResult.url);
}
