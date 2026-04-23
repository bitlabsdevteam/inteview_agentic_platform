import { type AccountRole, parseAccountRole } from "@/lib/auth/roles";
import { getRoleDestination } from "@/lib/auth/roles";

export type GoogleOAuthIntent = "login" | "register";

type SignInWithOAuthPayload = {
  provider: "google";
  options: {
    redirectTo: string;
    queryParams: {
      access_type: "offline";
      prompt: "select_account";
    };
    skipBrowserRedirect: true;
  };
};

type SignInWithOAuthResult = {
  data: {
    url: string | null;
  };
  error: {
    message: string;
  } | null;
};

type BeginGoogleOAuthDependencies = {
  intent: GoogleOAuthIntent;
  role: string;
  siteUrl: string;
  signInWithOAuth: (payload: SignInWithOAuthPayload) => Promise<SignInWithOAuthResult>;
};

type BeginGoogleOAuthResult =
  | {
      status: "error";
      message: string;
    }
  | {
      status: "success";
      url: string;
    };

export function getGoogleAuthEntryPath(intent: GoogleOAuthIntent) {
  return intent === "login" ? "/login" : "/register";
}

export function buildGoogleOAuthCallbackUrl({
  siteUrl,
  intent,
  role
}: {
  siteUrl: string;
  intent: GoogleOAuthIntent;
  role: AccountRole | null;
}) {
  const callbackUrl = new URL("/auth/callback", siteUrl);

  callbackUrl.searchParams.set("intent", intent);

  if (role) {
    callbackUrl.searchParams.set("role", role);
  }

  return callbackUrl.toString();
}

export function buildAuthErrorRedirectPath({
  intent,
  message,
  role
}: {
  intent: GoogleOAuthIntent;
  message: string;
  role?: string;
}) {
  const redirectUrl = new URL(getGoogleAuthEntryPath(intent), "http://localhost");

  redirectUrl.searchParams.set("authError", message);

  const parsedRole = parseAccountRole(role);

  if (parsedRole) {
    redirectUrl.searchParams.set("role", parsedRole);
  }

  return `${redirectUrl.pathname}${redirectUrl.search}`;
}

export function buildRoleCompletionPath(intent: GoogleOAuthIntent) {
  return `/auth/complete-role?intent=${intent}`;
}

export function resolveOAuthDestination(role: AccountRole | null, intent: GoogleOAuthIntent) {
  if (role) {
    return getRoleDestination(role);
  }

  return buildRoleCompletionPath(intent);
}

function formatOAuthErrorMessage(message: string) {
  const normalizedMessage = message.trim().toLowerCase();

  if (!normalizedMessage) {
    return "We could not start Google sign-in right now.";
  }

  if (normalizedMessage.includes("provider is not enabled")) {
    return "Google sign-in is not configured for this environment yet.";
  }

  return message.trim();
}

export async function beginGoogleOAuth({
  intent,
  role,
  siteUrl,
  signInWithOAuth
}: BeginGoogleOAuthDependencies): Promise<BeginGoogleOAuthResult> {
  const parsedRole = parseAccountRole(role);

  if (intent === "register" && !parsedRole) {
    return {
      message: "Choose Employer or Job Seeker before continuing with Google.",
      status: "error"
    };
  }

  const signInResult = await signInWithOAuth({
    options: {
      queryParams: {
        access_type: "offline",
        prompt: "select_account"
      },
      redirectTo: buildGoogleOAuthCallbackUrl({
        intent,
        role: parsedRole,
        siteUrl
      }),
      skipBrowserRedirect: true
    },
    provider: "google"
  });

  if (signInResult.error || !signInResult.data.url) {
    return {
      message: formatOAuthErrorMessage(
        signInResult.error?.message ?? "We could not start Google sign-in right now."
      ),
      status: "error"
    };
  }

  return {
    status: "success",
    url: signInResult.data.url
  };
}
