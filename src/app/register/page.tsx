import { Suspense } from "react";

import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { RegistrationScreen } from "./registration-screen";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  await enforceRouteAccess("/register");

  return (
    <Suspense fallback={null}>
      <RegistrationScreen />
    </Suspense>
  );
}
