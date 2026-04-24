const REQUIRED_PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
] as const;

type PublicEnvKey = (typeof REQUIRED_PUBLIC_ENV_KEYS)[number];

type EnvSource = Record<string, string | undefined>;
const LOCAL_SITE_URL = "http://localhost:3000";

export type PublicEnv = {
  siteUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function readRequired(env: EnvSource, key: PublicEnvKey): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required public environment variable: ${key}`);
  }

  return value;
}

function readSiteUrl(env: EnvSource): string {
  const value = env.NEXT_PUBLIC_SITE_URL?.trim();

  if (value) {
    return value;
  }

  if (env.NODE_ENV !== "production") {
    return LOCAL_SITE_URL;
  }

  throw new Error("Missing required public environment variable: NEXT_PUBLIC_SITE_URL");
}

export function getPublicSiteUrl(env: EnvSource = process.env as EnvSource): string {
  return readSiteUrl(env);
}

export function getPublicEnv(env: EnvSource = process.env as EnvSource): PublicEnv {
  return {
    siteUrl: getPublicSiteUrl(env),
    supabaseUrl: readRequired(env, "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readRequired(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  };
}
