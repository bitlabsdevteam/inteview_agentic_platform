import { Suspense } from "react";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { LoginScreen } from "./login-screen";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await enforceRouteAccess("/login");
  const accountHeaderState = await getAccountHeaderState();

  return (
    <Suspense fallback={null}>
      <LoginScreen header={<AccountHeader state={accountHeaderState} />} />
    </Suspense>
  );
}
