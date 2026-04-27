"use client";

import { useEffect, useMemo, useState } from "react";

import { EmployerJobAgentComposer } from "@/components/employer-job-agent-composer";
import { EmployerJobAssistantChatLoader } from "@/components/employer-job-assistant-chat-loader";

export const EMPLOYER_JOB_ASSISTANT_STORAGE_KEY = "employer-job-assistant-window-collapsed";
export const EMPLOYER_JOB_ASSISTANT_NAME_STORAGE_KEY = "employer-job-assistant-name";
export const DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME = "Aya";

type EmployerJobAssistantMode = "create" | "refine";

type EmployerJobAssistantWindowProps = {
  mode: EmployerJobAssistantMode;
  jobId?: string;
  initialCollapsed?: boolean;
};

function readStoredCollapsedState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(EMPLOYER_JOB_ASSISTANT_STORAGE_KEY) === "true";
}

function normalizeAssistantName(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME;
  }

  return trimmed.slice(0, 32);
}

function readStoredAssistantName() {
  if (typeof window === "undefined") {
    return DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME;
  }

  return normalizeAssistantName(
    window.localStorage.getItem(EMPLOYER_JOB_ASSISTANT_NAME_STORAGE_KEY) ??
      DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME
  );
}

function getModeLabel(mode: EmployerJobAssistantMode) {
  return mode === "create" ? "Create Mode" : "Refine Mode";
}

function getModeDescription(mode: EmployerJobAssistantMode) {
  return mode === "create"
    ? "Use your assistant to turn a rough hiring brief into the first structured draft."
    : "Chat with your assistant to tighten the draft before employer review.";
}

export function EmployerJobAssistantWindow({
  mode,
  jobId,
  initialCollapsed = false
}: EmployerJobAssistantWindowProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [assistantName, setAssistantName] = useState(DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME);
  const [draftAssistantName, setDraftAssistantName] = useState(DEFAULT_EMPLOYER_JOB_ASSISTANT_NAME);
  const [isEditingAssistantName, setIsEditingAssistantName] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 980px)");
    const syncMediaState = () => {
      setIsMobile(media.matches);
    };

    syncMediaState();
    media.addEventListener("change", syncMediaState);

    return () => {
      media.removeEventListener("change", syncMediaState);
    };
  }, []);

  useEffect(() => {
    setIsCollapsed(readStoredCollapsedState());
    const storedAssistantName = readStoredAssistantName();
    setAssistantName(storedAssistantName);
    setDraftAssistantName(storedAssistantName);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      EMPLOYER_JOB_ASSISTANT_STORAGE_KEY,
      isCollapsed ? "true" : "false"
    );
  }, [isCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      EMPLOYER_JOB_ASSISTANT_NAME_STORAGE_KEY,
      normalizeAssistantName(assistantName)
    );
  }, [assistantName]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  function handleAssistantNameSave() {
    const nextAssistantName = normalizeAssistantName(draftAssistantName);
    setAssistantName(nextAssistantName);
    setDraftAssistantName(nextAssistantName);
    setIsEditingAssistantName(false);
  }

  const content = useMemo(() => {
    if (mode === "create") {
      return (
        <div className="employer-job-assistant-window__stack">
          <section className="employer-job-assistant-window__intro">
            <p className="employer-section-label">{assistantName}</p>
            <p>
              Capture the hiring need here. {assistantName} prepares the first draft and hands the
              structured workflow back to the wizard for employer review.
            </p>
          </section>
          <div className="employer-job-assistant-window__composer-grid">
            <EmployerJobAgentComposer />
          </div>
        </div>
      );
    }

    if (!jobId) {
      return (
        <section className="employer-job-assistant-window__empty-state">
          <p className="employer-section-label">Assistant Unavailable</p>
          <p>Select a job draft to continue refinement.</p>
        </section>
      );
    }

    return <EmployerJobAssistantChatLoader assistantName={assistantName} jobId={jobId} />;
  }, [assistantName, jobId, mode]);

  const desktopToggleLabel = isCollapsed ? "Expand assistant" : "Collapse assistant";
  const panelTitle = `${assistantName} chat`;
  const shouldShowRenameForm = isEditingAssistantName && (!isCollapsed || isMobile);

  const renameForm = shouldShowRenameForm ? (
    <form
      className="employer-job-assistant-window__rename-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleAssistantNameSave();
      }}
    >
      <label className="employer-composer__label" htmlFor="employer-assistant-name">
        Assistant display name
      </label>
      <div className="employer-job-assistant-window__rename-controls">
        <input
          id="employer-assistant-name"
          className="employer-job-assistant-window__rename-input"
          data-testid="employer-job-assistant-name-input"
          maxLength={32}
          onChange={(event) => setDraftAssistantName(event.currentTarget.value)}
          value={draftAssistantName}
        />
        <button className="employer-composer__button" type="submit">
          Save name
        </button>
      </div>
    </form>
  ) : null;

  if (isMobile) {
    return (
      <>
        <button
          aria-controls="employer-job-assistant-mobile-panel"
          aria-expanded={isMobileOpen}
          className="employer-job-assistant-window__mobile-trigger employer-composer__button"
          data-testid="employer-job-assistant-mobile-trigger"
          onClick={() => setIsMobileOpen((current) => !current)}
          type="button"
        >
          {isMobileOpen ? `Close ${assistantName}` : `Message ${assistantName}`}
        </button>

        {isMobileOpen ? (
          <div
            className="employer-job-assistant-window__mobile-backdrop"
            data-testid="employer-job-assistant-mobile-backdrop"
            onClick={() => setIsMobileOpen(false)}
          >
            <aside
              aria-label={panelTitle}
              className="employer-job-assistant-window employer-job-assistant-window--mobile"
              data-assistant-mode={mode}
              data-collapsed="false"
              data-testid="employer-job-assistant-window"
              id="employer-job-assistant-mobile-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="employer-job-assistant-window__header">
                <div className="employer-job-assistant-window__header-copy">
                  <p className="employer-section-label">Assistant</p>
                  <h2>{assistantName}</h2>
                  <p className="employer-job-assistant-window__header-description">
                    {getModeDescription(mode)}
                  </p>
                </div>
                <div className="employer-job-assistant-window__header-actions">
                  <span className="employer-chat-panel__status">{getModeLabel(mode)}</span>
                  <button
                    className="employer-composer__button employer-composer__button--secondary"
                    data-testid="employer-job-assistant-rename-trigger"
                    onClick={() => {
                      setDraftAssistantName(assistantName);
                      setIsEditingAssistantName((current) => !current);
                    }}
                    type="button"
                  >
                    {isEditingAssistantName ? "Cancel rename" : "Rename"}
                  </button>
                  <button
                    className="employer-composer__button employer-composer__button--secondary"
                    data-testid="employer-job-assistant-toggle"
                    onClick={() => setIsMobileOpen(false)}
                    type="button"
                  >
                    Close assistant
                  </button>
                </div>
                {renameForm}
              </header>
              <div className="employer-job-assistant-window__body">{content}</div>
            </aside>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <aside
      aria-label={panelTitle}
      className={`employer-job-assistant-window${isCollapsed ? " employer-job-assistant-window--collapsed" : ""}`}
      data-assistant-mode={mode}
      data-collapsed={isCollapsed ? "true" : "false"}
      data-testid="employer-job-assistant-window"
    >
      <header className="employer-job-assistant-window__header">
        <div className="employer-job-assistant-window__header-copy">
          <p className="employer-section-label">Assistant</p>
          <h2>{assistantName}</h2>
          {!isCollapsed ? (
            <p className="employer-job-assistant-window__header-description">
              {getModeDescription(mode)}
            </p>
          ) : null}
        </div>
        <div className="employer-job-assistant-window__header-actions">
          <span className="employer-chat-panel__status">{getModeLabel(mode)}</span>
          {!isCollapsed ? (
            <button
              className="employer-composer__button employer-composer__button--secondary"
              data-testid="employer-job-assistant-rename-trigger"
              onClick={() => {
                setDraftAssistantName(assistantName);
                setIsEditingAssistantName((current) => !current);
              }}
              type="button"
            >
              {isEditingAssistantName ? "Cancel rename" : "Rename"}
            </button>
          ) : null}
          <button
            className="employer-composer__button employer-composer__button--secondary"
            data-testid="employer-job-assistant-toggle"
            onClick={() => setIsCollapsed((current) => !current)}
            type="button"
          >
            {desktopToggleLabel}
          </button>
        </div>
        {renameForm}
      </header>

      {isCollapsed ? (
        <div className="employer-job-assistant-window__collapsed-copy">
          <p>Keep {assistantName} one click away while the stage panel changes.</p>
        </div>
      ) : (
        <div className="employer-job-assistant-window__body">{content}</div>
      )}
    </aside>
  );
}
