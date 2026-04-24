import { JobSeekerShell } from "@/components/job-seeker-shell";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";

export const dynamic = "force-dynamic";

export default async function JobSeekerPage() {
  await enforceRouteAccess("/job-seeker");

  return <JobSeekerShell />;
}
