import { Suspense } from "react";
import { InviteActivate } from "./invite-activate";

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ops-bg font-sans text-ops-gray">
          Cargando…
        </div>
      }
    >
      <InviteActivate />
    </Suspense>
  );
}
