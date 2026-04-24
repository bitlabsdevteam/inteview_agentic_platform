import { AccountHeader, getAccountHeaderState } from "@/components/account-header";

const workflowSteps = [
  {
    label: "Intake",
    detail: "Capture the hiring brief, level, team constraints, and target outcomes."
  },
  {
    label: "Draft",
    detail: "Shape the first job description draft with responsibilities, must-haves, and scorecards."
  },
  {
    label: "Review",
    detail: "Flag gaps, bias risks, and approval notes before the role is published."
  }
];

const signalChecklist = [
  "Target hiring manager and department",
  "Role level, location, and compensation band",
  "Core outcomes for the first 90 days",
  "Interview loop and approval dependencies"
];

const threadMessages = [
  {
    speaker: "Aya, Employer Agent",
    tone: "agent",
    body:
      "I’m ready to turn your hiring brief into a publishable role. Start with the job title, level, and the business problem this hire needs to solve."
  },
  {
    speaker: "Session Focus",
    tone: "system",
    body:
      "This shell is prepared for future job-description workflows, structured extraction, evaluation, and audit traces."
  },
  {
    speaker: "Suggested Prompt",
    tone: "draft",
    body:
      "Draft a senior data engineer role for our platform team. Emphasize reliability, warehouse modeling, and cross-functional delivery with product and infrastructure."
  }
];

export async function EmployerChatShell() {
  const accountHeaderState = await getAccountHeaderState();

  return (
    <main className="employer-page">
      <div className="employer-shell">
        <AccountHeader state={accountHeaderState} />

        <section className="employer-hero">
          <div className="employer-hero__copy">
            <p className="employer-eyebrow">Protected Employer Route</p>
            <h1>Employer agent workspace</h1>
            <p className="employer-summary">
              Land directly in a job-design workspace where the employer agent can gather hiring
              context, shape a role brief, and prepare the next drafting pass.
            </p>
          </div>

          <div className="employer-hero__meta">
            <p className="employer-section-label">Session Posture</p>
            <div className="employer-session-pulse">
              <strong>Ready for intake</strong>
              <span>Role-aware protected shell with a prompt composer, planning board, and audit-minded context.</span>
            </div>
          </div>
        </section>

        <section className="employer-board" data-testid="employer-workspace-board">
          <article className="employer-chat-panel">
            <div className="employer-chat-panel__header">
              <div>
                <p className="employer-section-label">Agent Thread</p>
                <h2>Shape the next hiring brief</h2>
              </div>
              <p className="employer-chat-panel__status">Workspace synced to employer routing</p>
            </div>

            <div className="employer-chat-thread" data-testid="employer-chat-thread">
              {threadMessages.map((message) => (
                <article
                  key={message.speaker}
                  className={`employer-message employer-message--${message.tone}`}
                >
                  <p className="employer-message__speaker">{message.speaker}</p>
                  <p className="employer-message__body">{message.body}</p>
                </article>
              ))}
            </div>

            <div className="employer-composer">
              <label className="employer-composer__label" htmlFor="employer-chat-composer">
                Prompt the employer agent
              </label>
              <textarea
                className="employer-composer__input"
                data-testid="employer-chat-composer"
                id="employer-chat-composer"
                name="employerPrompt"
                placeholder="Describe the role, the team, and the problem this hire should solve."
                rows={5}
                defaultValue=""
              />
              <div className="employer-composer__actions">
                <button className="employer-composer__button" type="button">
                  Start Intake
                </button>
                <button
                  className="employer-composer__button employer-composer__button--secondary"
                  type="button"
                >
                  Attach Notes
                </button>
              </div>
            </div>
          </article>

          <aside className="employer-rail">
            <article className="employer-signal-card" data-testid="employer-signal-card">
              <p className="employer-section-label">Role Brief</p>
              <strong>Collect the non-negotiables before drafting.</strong>
              <ul>
                {signalChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="employer-rail-card">
              <p className="employer-section-label">Workflow Stages</p>
              <div className="employer-stage-list">
                {workflowSteps.map((step) => (
                  <div key={step.label} className="employer-stage-item">
                    <strong>{step.label}</strong>
                    <span>{step.detail}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="employer-rail-card">
              <p className="employer-section-label">Guardrails</p>
              <ul className="employer-guardrail-list">
                <li>Keep prompts server-side and versioned.</li>
                <li>Use structured extraction rather than full-record dumping.</li>
                <li>Require review before publishing or changing hiring decisions.</li>
              </ul>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
