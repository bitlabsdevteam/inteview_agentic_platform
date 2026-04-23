import { buildRoleCompletionPath } from "@/lib/auth/google-oauth";
import { getRoleDestination, parseAccountRole } from "@/lib/auth/roles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginUserInput = {
  email: string;
  password: string;
};

export type LoginUserResult =
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<"email" | "password", string>>;
    }
  | {
      status: "success";
      redirectTo: string;
    };

type LoginUserDependencies = {
  signInWithPassword: (payload: {
    email: string;
    password: string;
  }) => Promise<{
    data: {
      user: {
        user_metadata?: {
          role?: string;
        };
      } | null;
    };
    error: {
      message: string;
    } | null;
  }>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function formatLoginErrorMessage(message: string) {
  const normalizedMessage = message.trim().toLowerCase();

  if (!normalizedMessage) {
    return "We could not sign you in right now.";
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }

  return message.trim();
}

export async function loginUser(
  input: LoginUserInput,
  { signInWithPassword }: LoginUserDependencies
): Promise<LoginUserResult> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const fieldErrors: Partial<Record<"email" | "password", string>> = {};

  if (!email) {
    fieldErrors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter your password.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: Object.values(fieldErrors)[0]!,
      status: "error"
    };
  }

  const loginResult = await signInWithPassword({
    email,
    password
  });

  if (loginResult.error || !loginResult.data.user) {
    return {
      message: formatLoginErrorMessage(
        loginResult.error?.message ?? "We could not sign you in right now."
      ),
      status: "error"
    };
  }

  const role = parseAccountRole(loginResult.data.user.user_metadata?.role);

  return {
    redirectTo: role ? getRoleDestination(role) : buildRoleCompletionPath("login"),
    status: "success"
  };
}
