import { Suspense } from "react";

import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { LoginScreen } from "./login-screen";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await enforceRouteAccess("/login");

  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
