import { Suspense } from "react";

import { RegistrationScreen } from "./registration-screen";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegistrationScreen />
    </Suspense>
  );
}
