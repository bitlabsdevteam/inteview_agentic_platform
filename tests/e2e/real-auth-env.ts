function readEnv(key: string) {
  const value = process.env[key]?.trim();

  return value ? value : null;
}

export function getEmployerCredentials() {
  return {
    email: readEnv("E2E_SUPABASE_EMPLOYER_EMAIL"),
    password: readEnv("E2E_SUPABASE_EMPLOYER_PASSWORD")
  };
}

export function getJobSeekerCredentials() {
  return {
    email: readEnv("E2E_SUPABASE_JOB_SEEKER_EMAIL"),
    password: readEnv("E2E_SUPABASE_JOB_SEEKER_PASSWORD")
  };
}

export function getJobSeekerSignupCredentials() {
  return {
    email: readEnv("E2E_SUPABASE_SIGNUP_JOB_SEEKER_EMAIL"),
    password: readEnv("E2E_SUPABASE_SIGNUP_JOB_SEEKER_PASSWORD")
  };
}

export function hasCredentials(credentials: {
  email: string | null;
  password: string | null;
}) {
  return Boolean(credentials.email && credentials.password);
}

export function isRealGoogleOAuthEnabled() {
  return process.env.E2E_ENABLE_REAL_GOOGLE_OAUTH === "true";
}
