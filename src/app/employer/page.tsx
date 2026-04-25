import { redirect } from "next/navigation";

import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";

export const dynamic = "force-dynamic";

export default async function EmployerPage() {
  await enforceRouteAccess("/employer");

  redirect("/employer/jobs");
}
