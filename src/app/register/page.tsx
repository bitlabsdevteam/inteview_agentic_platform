import { Suspense } from "react";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";
import { RegistrationScreen } from "./registration-screen";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  await enforceRouteAccess("/register");
  const accountHeaderState = await getAccountHeaderState();

  return (
    <Suspense fallback={null}>
      <RegistrationScreen header={<AccountHeader state={accountHeaderState} />} />
    </Suspense>
  );
}
