import { AccountHeader, getAccountHeaderState } from "@/components/account-header";

import { CompleteRoleScreen } from "./complete-role-screen";

export const dynamic = "force-dynamic";

export default async function CompleteRolePage() {
  const accountHeaderState = await getAccountHeaderState();

  return <CompleteRoleScreen header={<AccountHeader state={accountHeaderState} />} />;
}
