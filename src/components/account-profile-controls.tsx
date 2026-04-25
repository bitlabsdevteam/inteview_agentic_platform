import React from "react";

import type { AccountHeaderAction, AccountHeaderState } from "@/components/account-header";
import { submitLogout } from "@/app/logout/actions";

type AccountProfileControlsProps = {
  actions: AccountHeaderAction[];
  state: AccountHeaderState;
};

export function AccountProfileControls({ actions, state }: AccountProfileControlsProps) {
  return (
    <section
      aria-label="Account State"
      className="account-header__profile"
      data-testid={state.isAuthenticated ? "account-header-profile" : "account-header-public-state"}
    >
      <p className="account-header__profile-label">
        {state.isAuthenticated ? "Account" : "Visitor"}
      </p>
      <strong className="account-header__identity">{state.identityLabel}</strong>
      <span className="account-header__summary">
        {state.isAuthenticated
          ? state.roleLabel
            ? `Signed in as ${state.roleLabel}.`
            : "Signed in. Finish role setup to continue."
          : "Sign in or register to access your workspace."}
      </span>

      {actions.length ? (
        <div className="account-header__actions" data-testid="account-header-account-actions">
          {actions.map((action) => (
            <form key={action.id} action={submitLogout}>
              <button
                className="account-header__action-button"
                data-testid={action.testId}
                type="submit"
              >
                {action.label}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </section>
  );
}
