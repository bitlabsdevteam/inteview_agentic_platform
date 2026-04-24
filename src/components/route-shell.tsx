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
    <main>
      <div
        style={{
          display: "grid",
          gap: "24px",
          padding: "32px",
          borderRadius: "24px",
          background: "rgba(255, 255, 255, 0.86)",
          border: "1px solid rgba(31, 41, 51, 0.12)",
          boxShadow: "0 24px 60px rgba(31, 41, 51, 0.10)"
        }}
      >
        <AccountHeader state={accountHeaderState} />
        <div style={{ display: "grid", gap: "12px" }}>
          <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "0.78rem" }}>
            {eyebrow}
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 4rem)" }}>{title}</h1>
          <p style={{ margin: 0, maxWidth: "60ch", lineHeight: 1.6 }}>{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
