import React from "react";
import type { ReactNode } from "react";

import { AccountHeader, getAccountHeaderState } from "@/components/account-header";

type RouteShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export async function RouteShell({
  eyebrow,
  title,
  description,
  children
}: RouteShellProps) {
  const accountHeaderState = await getAccountHeaderState();

  return (
    <main className="app-page route-page">
      <div className="product-shell route-shell">
        <AccountHeader state={accountHeaderState} />
        <div className="route-shell__intro">
          <p className="route-shell__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
