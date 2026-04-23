import { DEFAULT_ROLE_DESTINATION } from "@/lib/routes";

export type AccountRole = keyof typeof DEFAULT_ROLE_DESTINATION;

export function parseAccountRole(value: string | null | undefined): AccountRole | null {
  if (value === "employer" || value === "job_seeker") {
    return value;
  }

  return null;
}

export function formatAccountRole(role: AccountRole | null) {
  if (role === "employer") {
    return "Employer";
  }

  if (role === "job_seeker") {
    return "Job Seeker";
  }

  return null;
}

export function getRoleDestination(role: AccountRole) {
  return DEFAULT_ROLE_DESTINATION[role];
}
