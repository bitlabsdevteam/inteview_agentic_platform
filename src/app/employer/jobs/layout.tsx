import type { ReactNode } from "react";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { EmployerJobsLayoutShell } from "@/components/employer-jobs-layout-shell";

type EmployerJobsLayoutProps = {
  children: ReactNode;
};

export default async function EmployerJobsLayout({ children }: EmployerJobsLayoutProps) {
  const accountHeaderState = await getAccountHeaderState();

  return (
    <main className="app-page employer-page">
      <div className="product-shell employer-shell">
        <AccountHeader state={accountHeaderState} />
        <EmployerJobsLayoutShell>{children}</EmployerJobsLayoutShell>
      </div>
    </main>
  );
}
