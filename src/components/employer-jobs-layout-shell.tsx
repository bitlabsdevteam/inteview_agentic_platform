"use client";

import { type ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";

import { EmployerJobAssistantWindow } from "@/components/employer-job-assistant-window";

type EmployerJobsLayoutShellProps = {
  children: ReactNode;
};

function getWizardRouteState(pathname: string) {
  if (pathname === "/employer/jobs/new") {
    return {
      mode: "create" as const
    };
  }

  const match = pathname.match(/^\/employer\/jobs\/([^/]+)$/);

  if (!match) {
    return null;
  }

  return {
    mode: "refine" as const,
    jobId: match[1]
  };
}

export function EmployerJobsLayoutShell({ children }: EmployerJobsLayoutShellProps) {
  const pathname = usePathname();
  const wizardRouteState = useMemo(() => getWizardRouteState(pathname), [pathname]);

  if (!wizardRouteState) {
    return <>{children}</>;
  }

  return (
    <div className="employer-job-wizard-layout" data-testid="employer-job-wizard-layout">
      <div className="employer-job-wizard-layout__main">{children}</div>
      <EmployerJobAssistantWindow
        jobId={wizardRouteState.jobId}
        mode={wizardRouteState.mode}
      />
    </div>
  );
}
