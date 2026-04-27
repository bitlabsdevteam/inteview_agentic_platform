import Link from "next/link";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";
import { EmployerJobAgentComposer } from "@/components/employer-job-agent-composer";
import { enforceRouteAccess } from "@/lib/auth/enforce-route-access";

export const dynamic = "force-dynamic";

export default async function NewEmployerJobPage() {
  await enforceRouteAccess("/employer/jobs/new");
  const accountHeaderState = await getAccountHeaderState();

  return (
    <main className="app-page employer-page">
      <div className="product-shell employer-shell">
        <AccountHeader state={accountHeaderState} />

        <section className="employer-jobs-hero">
          <div>
            <p className="employer-section-label">Job Creation Agent</p>
            <h1>Create a job with the agent</h1>
            <p className="employer-summary">
              Start with the hiring need. The agent infers the role structure and keeps publishing
              behind review.
            </p>
          </div>
          <Link className="employer-composer__button employer-composer__button--secondary" href="/employer/jobs">
            Back to Jobs
          </Link>
        </section>

        <section className="employer-job-agent" aria-label="Prompt-first job creation">
          <EmployerJobAgentComposer />

          <aside className="employer-job-agent__side" aria-label="Generated job review">
            <section className="employer-job-agent__side-section" data-testid="employer-job-generated-state">
              <p className="employer-section-label">Generated Draft State</p>
              <h2>Draft queued after generation</h2>
              <p>
                Title, role scope, outcomes, requirements, compensation notes, and interview loop
                will appear on the draft review page.
              </p>
            </section>

            <section className="employer-job-agent__side-section" data-testid="employer-job-assumptions">
              <p className="employer-section-label">Assumptions</p>
              <ul>
                <li>Inferred fields are labeled for employer review.</li>
                <li>Defaulted values stay editable before publication.</li>
              </ul>
            </section>

            <section className="employer-job-agent__side-section" data-testid="employer-job-missing-fields">
              <p className="employer-section-label">Missing Critical Fields</p>
              <p>Targeted follow-up questions appear only when a gap blocks a useful draft.</p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
