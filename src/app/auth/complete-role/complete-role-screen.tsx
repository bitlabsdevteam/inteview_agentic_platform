"use client";

import type { ReactNode } from "react";
import { useActionState, useState } from "react";

import { RoleSelector } from "@/components/role-selector";
import { formatAccountRole, type AccountRole } from "@/lib/auth/roles";
import {
  type CompleteRoleResult,
  submitRoleCompletion
} from "./actions";

const COMPLETE_ROLE_INITIAL_STATE: CompleteRoleResult = {
  status: "idle"
};

type CompleteRoleScreenProps = {
  header: ReactNode;
};

export function CompleteRoleScreen({ header }: CompleteRoleScreenProps) {
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
  const [formState, formAction, isPending] = useActionState(
    submitRoleCompletion,
    COMPLETE_ROLE_INITIAL_STATE
  );
  const selectedRoleLabel = formatAccountRole(selectedRole);

  return (
    <main>
      <div className="register-shell">
        {header}

        <section className="register-hero">
          <div className="register-hero__copy">
            <p className="register-eyebrow">OAuth Role Completion</p>
            <h1>Complete your role setup</h1>
            <p className="register-summary">
              This Google-authenticated account does not have a saved platform role yet. Choose the
              correct role so the app can route you into the right protected experience.
            </p>
          </div>

          <div className="register-hero__panel">
            <p className="register-section-label">Role Status</p>
            <p className="register-role-status" data-testid="complete-role-summary">
              {selectedRoleLabel
                ? `Selected role: ${selectedRoleLabel}`
                : "Choose Employer or Job Seeker to finish Google sign-in."}
            </p>
          </div>
        </section>

        <form action={formAction} className="register-form">
          <RoleSelector selectedRole={selectedRole} onChange={setSelectedRole} />

          {formState.message ? (
            <p
              aria-live="polite"
              className="register-form-feedback register-form-feedback--error"
              data-testid="complete-role-feedback"
              role="alert"
            >
              {formState.message}
            </p>
          ) : null}

          <div className="register-form__footer">
            <p className="register-footer-copy">
              Saving the role here updates the authenticated user metadata before redirecting into
              the correct area of the product.
            </p>
            <button
              className="register-submit-button"
              data-testid="complete-role-submit-button"
              disabled={!selectedRole || isPending}
              type="submit"
            >
              {isPending ? "Saving Role..." : "Continue To Workspace"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
