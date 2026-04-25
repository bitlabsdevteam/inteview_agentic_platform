import React from "react";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";

const prepChecklist = [
  "Resume context and strongest project stories",
  "Target role, level, and interview format",
  "Practice goals for behavioral and technical rounds",
  "Scheduling constraints and follow-up reminders"
];

const preparationStreams = [
  {
    title: "Interview Prep",
    detail: "Route into guided preparation once question libraries, rubrics, and coaching loops are added."
  },
  {
    title: "Session Planning",
    detail: "Keep the next interview steps, timing, and confidence signals visible in one place."
  },
  {
    title: "Agent Follow-Up",
    detail: "Prepare for future virtual interview flows and post-session feedback without losing role context."
  }
];

export async function JobSeekerShell() {
  const accountHeaderState = await getAccountHeaderState();

  return (
    <main className="app-page job-seeker-page">
      <div className="product-shell job-seeker-shell">
        <AccountHeader state={accountHeaderState} />

        <section className="job-seeker-hero">
          <div className="job-seeker-hero__copy">
            <p className="job-seeker-eyebrow">Job Seeker Workspace</p>
            <h1>Job seeker workspace</h1>
            <p className="job-seeker-summary">
              This workspace gives candidates a clear starting point for interview preparation,
              planning, and guided practice.
            </p>
          </div>

          <article className="job-seeker-prep-card" data-testid="job-seeker-prep-card">
            <p className="job-seeker-section-label">Account</p>
            <strong>Signed in as job seeker</strong>
            <span>
              Your workspace is ready for interview preparation and planning.
            </span>
          </article>
        </section>

        <section className="job-seeker-board">
          <article className="job-seeker-focus-card" data-testid="job-seeker-focus-card">
            <p className="job-seeker-section-label">Next Surface</p>
            <h2>Interview Prep</h2>
            <p>
              The next sprint can plug candidate-specific coaching, mock interview loops, and
              preparation plans into this protected shell without changing the auth flow.
            </p>
          </article>

          <article className="job-seeker-checklist-card" data-testid="job-seeker-checklist">
            <p className="job-seeker-section-label">Preparation Checklist</p>
            <ul>
              {prepChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="job-seeker-stream-card">
            <p className="job-seeker-section-label">Future Modules</p>
            <div className="job-seeker-stream-list">
              {preparationStreams.map((stream) => (
                <div key={stream.title} className="job-seeker-stream-item">
                  <strong>{stream.title}</strong>
                  <span>{stream.detail}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
