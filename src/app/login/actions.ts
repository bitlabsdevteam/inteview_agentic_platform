"use server";

import { persistMockAuthSession } from "@/lib/auth/mock-session";
import { buildRoleCompletionPath, resolveOAuthDestination } from "@/lib/auth/google-oauth";
import { parseAccountRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

import {
  beginGoogleOAuth,
  buildAuthErrorRedirectPath,
} from "@/lib/auth/google-oauth";
import { loginUser } from "@/lib/auth/login-user";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginFormValueKey = "email" | "password" | "mockRole" | "mockMissingRole";

export type LoginFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

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

async function createPasswordLoginHandler() {
  if (useMockAuth()) {
    return async ({ email, password }: { email: string; password: string }) => {
      if (password !== "securepass123") {
        return {
          data: {
            user: null
          },
          error: {
            message: "Invalid login credentials"
          }
        };
      }

      if (email === "employer@example.com") {
        return {
          data: {
            user: {
              user_metadata: {
                role: "employer"
              }
            }
          },
          error: null
        };
      }

      if (email === "jobseeker@example.com") {
        return {
          data: {
            user: {
              user_metadata: {
                role: "job_seeker"
              }
            }
          },
          error: null
        };
      }

      if (email === "roleless@example.com") {
        return {
          data: {
            user: {
              user_metadata: {}
            }
          },
          error: null
        };
      }

      return {
        data: {
          user: null
        },
        error: {
          message: "Invalid login credentials"
        }
      };
    };
  }

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

  if (useMockAuth()) {
    await persistMockAuthSession(
      result.redirectTo === "/employer"
        ? "employer"
        : result.redirectTo === "/job-seeker"
          ? "job_seeker"
          : null
    );
  }

  redirect(result.redirectTo);
}

export async function startGoogleLogin(formData: FormData) {
  const mockRole = getFormValue(formData, "mockRole");
  const mockMissingRole = getFormValue(formData, "mockMissingRole");

  if (useMockAuth()) {
    if (mockMissingRole === "true") {
      await persistMockAuthSession(null);
      redirect(buildRoleCompletionPath("login"));
    }

    const parsedRole = parseAccountRole(mockRole.trim());

    await persistMockAuthSession(parsedRole);

    redirect(resolveOAuthDestination(parsedRole, "login"));
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
