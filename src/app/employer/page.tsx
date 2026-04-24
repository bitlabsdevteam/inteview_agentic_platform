import { EmployerChatShell } from "@/components/employer-chat-shell";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";

export const dynamic = "force-dynamic";

export default async function EmployerPage() {
  await enforceRouteAccess("/employer");

  return <EmployerChatShell />;
}
