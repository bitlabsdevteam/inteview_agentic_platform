import { DEFAULT_ROLE_DESTINATION } from "@/lib/routes";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export type RegistrationRole = keyof typeof DEFAULT_ROLE_DESTINATION;

export type RegisterUserInput = {
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
};

export type RegisterUserResult = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "confirmPassword" | "role", string>>;
};

type SignUpPayload = {
  email: string;
  password: string;
  options: {
    data: {
      role: RegistrationRole;
    };
    emailRedirectTo: string;
  };
};

type RegisterUserDependencies = {
  signUp: (payload: SignUpPayload) => Promise<{
    error: {
      message: string;
    } | null;
  }>;
  siteUrl: string;
};

export const REGISTER_USER_INITIAL_STATE: RegisterUserResult = {
  status: "idle"
};

function isRegistrationRole(role: string): role is RegistrationRole {
  return role === "employer" || role === "job_seeker";
}

function getRoleLabel(role: RegistrationRole) {
  return role === "employer" ? "Employer" : "Job Seeker";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function formatErrorMessage(message: string) {
  const normalizedMessage = message.trim().toLowerCase();

  if (normalizedMessage.includes("already registered")) {
    return "An account with this email already exists.";
  }

  return message.trim() || "We could not create your account right now.";
}

export async function registerUser(
  input: RegisterUserInput,
  { signUp, siteUrl }: RegisterUserDependencies
): Promise<RegisterUserResult> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const confirmPassword = input.confirmPassword;
  const role = input.role.trim();
  const fieldErrors: RegisterUserResult["fieldErrors"] = {};

  if (!isRegistrationRole(role)) {
    fieldErrors.role = "Choose Employer or Job Seeker before creating the account.";
  }

  if (!email) {
    fieldErrors.email = "Enter an email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter a password.";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters for the password.`;
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Confirm your password.";
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords must match.";
  }

  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const firstFieldError = Object.values(fieldErrors)[0];

    return {
      fieldErrors,
      message: firstFieldError,
      status: "error"
    };
  }

  const signUpResult = await signUp({
    email,
    options: {
      data: {
        role
      },
      emailRedirectTo: `${siteUrl}${DEFAULT_ROLE_DESTINATION[role]}`
    },
    password
  });

  if (signUpResult.error) {
    return {
      message: formatErrorMessage(signUpResult.error.message),
      status: "error"
    };
  }

  return {
    message: `Account created for ${getRoleLabel(role)}. Check your email to continue.`,
    status: "success"
  };
}
