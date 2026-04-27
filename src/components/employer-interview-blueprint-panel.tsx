import {
  INTERVIEW_BLUEPRINT_PARSING_STRATEGIES,
  INTERVIEW_BLUEPRINT_RESPONSE_MODES,
  INTERVIEW_BLUEPRINT_TONE_PROFILES,
  type InterviewBlueprint,
  type InterviewBlueprintQuestion,
  type InterviewBlueprintStage
} from "@/lib/agents/job-posting/interview-blueprint";

type EmployerInterviewBlueprintPanelProps = {
  jobId: string;
  stageState: "current" | "complete" | "blocked" | "upcoming";
  blueprint: {
    title: string;
    objective: string;
    responseMode: InterviewBlueprint["responseMode"] | null;
    toneProfile: InterviewBlueprint["toneProfile"] | null;
    parsingStrategy: InterviewBlueprint["parsingStrategy"] | null;
    benchmarkSummary: string;
    approvalNotes?: string;
    stages: InterviewBlueprintStage[];
  };
  completenessGaps: string[];
  action?: (formData: FormData) => void | Promise<void>;
};

function createEmptyQuestion(questionOrder: number): InterviewBlueprintQuestion {
  return {
    questionOrder,
    questionText: "",
    intent: "",
    evaluationFocus: "",
    strongSignal: "",
    failureSignal: "",
    followUpPrompt: ""
  };
}

function createStageFallback(stages: InterviewBlueprintStage[]) {
  if (stages.length === 0) {
    return [
      {
        stageLabel: "Screen",
        stageOrder: 1,
        questions: [createEmptyQuestion(1)]
      }
    ];
  }

  return stages.map((stage) => ({
    ...stage,
    questions: stage.questions.length > 0 ? stage.questions : [createEmptyQuestion(1)]
  }));
}

function formatOptionLabel(value: string) {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function EmployerInterviewBlueprintPanel({
  jobId,
  stageState,
  blueprint,
  completenessGaps,
  action
}: EmployerInterviewBlueprintPanelProps) {
  const stages = createStageFallback(blueprint.stages);

  return (
    <form
      action={action}
      className="employer-jobs-panel employer-job-stage-panel employer-interview-blueprint-panel"
      data-stage-state={stageState}
      data-testid="employer-interview-blueprint-panel"
    >
      <input name="jobId" type="hidden" value={jobId} />
      <input name="stageCount" type="hidden" value={String(stages.length)} />

      <div className="employer-chat-panel__header">
        <div>
          <p className="employer-section-label">Stage 2</p>
          <h2>Interview Structure Design</h2>
        </div>
        <span className="employer-chat-panel__status">
          {stages.reduce((total, stage) => total + stage.questions.length, 0)} questions
        </span>
      </div>

      <p className="employer-summary">
        Configure the interview plan, response mode, question order, and evaluator guidance before
        review.
      </p>

      <div className="employer-job-stage-panel__summary-grid">
        <label className="register-field">
          Interview plan title
          <input defaultValue={blueprint.title} name="title" required />
        </label>
        <label className="register-field">
          Interview objective
          <textarea
            className="employer-composer__input"
            defaultValue={blueprint.objective}
            name="objective"
            required
            rows={4}
          />
        </label>
        <label className="register-field">
          Response mode
          <select defaultValue={blueprint.responseMode ?? ""} name="responseMode" required>
            <option value="">Select response mode</option>
            {INTERVIEW_BLUEPRINT_RESPONSE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {formatOptionLabel(mode)}
              </option>
            ))}
          </select>
        </label>
        <label className="register-field">
          Tone profile
          <select defaultValue={blueprint.toneProfile ?? ""} name="toneProfile" required>
            <option value="">Select tone profile</option>
            {INTERVIEW_BLUEPRINT_TONE_PROFILES.map((tone) => (
              <option key={tone} value={tone}>
                {formatOptionLabel(tone)}
              </option>
            ))}
          </select>
        </label>
        <label className="register-field">
          Parsing strategy
          <select defaultValue={blueprint.parsingStrategy ?? ""} name="parsingStrategy" required>
            <option value="">Select parsing strategy</option>
            {INTERVIEW_BLUEPRINT_PARSING_STRATEGIES.map((strategy) => (
              <option key={strategy} value={strategy}>
                {formatOptionLabel(strategy)}
              </option>
            ))}
          </select>
        </label>
        <label className="register-field">
          Benchmark summary
          <textarea
            className="employer-composer__input"
            defaultValue={blueprint.benchmarkSummary}
            name="benchmarkSummary"
            required
            rows={4}
          />
        </label>
      </div>

      <label className="register-field">
        Approval notes
        <textarea
          className="employer-composer__input"
          defaultValue={blueprint.approvalNotes ?? ""}
          name="approvalNotes"
          rows={3}
        />
      </label>

      <section className="employer-job-stage-panel__card">
        <p className="employer-section-label">Question Sets</p>
        <div className="employer-job-stage-panel__stages">
          {stages.map((stage, stageIndex) => (
            <section className="employer-job-stage-panel__stage" key={`${stage.stageLabel}-${stage.stageOrder}`}>
              <input
                name={`stageOrder_${stageIndex}`}
                type="hidden"
                value={String(stage.stageOrder)}
              />
              <input
                name={`questionCount_${stageIndex}`}
                type="hidden"
                value={String(stage.questions.length)}
              />
              <label className="register-field">
                Stage label
                <input
                  defaultValue={stage.stageLabel}
                  name={`stageLabel_${stageIndex}`}
                  required
                />
              </label>

              {stage.questions.map((question, questionIndex) => (
                <article
                  className="employer-interview-blueprint-panel__question-row"
                  data-testid="employer-interview-question-row"
                  key={`${stage.stageLabel}-${question.questionOrder}-${questionIndex}`}
                >
                  <input
                    name={`questionOrder_${stageIndex}_${questionIndex}`}
                    type="hidden"
                    value={String(question.questionOrder)}
                  />
                  <label className="register-field">
                    Question text
                    <textarea
                      className="employer-composer__input"
                      defaultValue={question.questionText}
                      name={`questionText_${stageIndex}_${questionIndex}`}
                      required
                      rows={3}
                    />
                  </label>
                  <div className="employer-job-stage-panel__summary-grid">
                    <label className="register-field">
                      Intent
                      <textarea
                        className="employer-composer__input"
                        defaultValue={question.intent}
                        name={`intent_${stageIndex}_${questionIndex}`}
                        required
                        rows={3}
                      />
                    </label>
                    <label className="register-field">
                      Evaluation focus
                      <input
                        defaultValue={question.evaluationFocus}
                        name={`evaluationFocus_${stageIndex}_${questionIndex}`}
                        required
                      />
                    </label>
                    <label className="register-field">
                      Strong signal
                      <textarea
                        className="employer-composer__input"
                        defaultValue={question.strongSignal}
                        name={`strongSignal_${stageIndex}_${questionIndex}`}
                        required
                        rows={3}
                      />
                    </label>
                    <label className="register-field">
                      Failure signal
                      <textarea
                        className="employer-composer__input"
                        defaultValue={question.failureSignal}
                        name={`failureSignal_${stageIndex}_${questionIndex}`}
                        required
                        rows={3}
                      />
                    </label>
                  </div>
                  <label className="register-field">
                    Follow-up prompt
                    <textarea
                      className="employer-composer__input"
                      defaultValue={question.followUpPrompt}
                      name={`followUpPrompt_${stageIndex}_${questionIndex}`}
                      required
                      rows={3}
                    />
                  </label>
                </article>
              ))}
            </section>
          ))}
        </div>
      </section>

      <section className="employer-job-stage-panel__card">
        <p className="employer-section-label">Readiness Hints</p>
        {completenessGaps.length > 0 ? (
          <ul className="employer-guardrail-list">
            {completenessGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        ) : (
          <p className="employer-message__body">
            Interview structure is ready for review once the employer is satisfied with the plan.
          </p>
        )}
      </section>

      <div className="employer-composer__actions">
        <button className="employer-composer__button employer-composer__button--secondary" type="submit">
          Save Interview Structure
        </button>
      </div>
    </form>
  );
}
