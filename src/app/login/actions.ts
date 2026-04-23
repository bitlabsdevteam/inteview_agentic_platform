"use server";

import { redirect } from "next/navigation";

import {
  beginGoogleOAuth,
  buildAuthErrorRedirectPath
} from "@/lib/auth/google-oauth";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginFormValueKey = "mockRole" | "mockMissingRole";

function getFormValue(formData: FormData, key: LoginFormValueKey) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function useMockAuth() {
  return process.env.INTERVIEW_AGENT_MOCK_AUTH === "true";
}

function getSiteUrl() {
  if (useMockAuth()) {
    return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://127.0.0.1:3000";
  }

  return getPublicEnv().siteUrl;
}

async function createGoogleOAuthHandler() {
  const supabase = await createSupabaseServerClient();

  return async (payload: Parameters<typeof supabase.auth.signInWithOAuth>[0]) =>
    supabase.auth.signInWithOAuth(payload);
}

export async function startGoogleLogin(formData: FormData) {
  const mockRole = getFormValue(formData, "mockRole");
  const mockMissingRole = getFormValue(formData, "mockMissingRole");

  if (useMockAuth()) {
    const callbackUrl = new URL("/auth/callback", getSiteUrl());

    callbackUrl.searchParams.set("intent", "login");

    if (mockMissingRole === "true") {
      callbackUrl.searchParams.set("mockMissingRole", "true");
    }

    if (mockRole.trim()) {
      callbackUrl.searchParams.set("mockRole", mockRole.trim());
    }

    redirect(callbackUrl.toString());
  }

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
