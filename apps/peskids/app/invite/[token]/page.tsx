import { Suspense } from 'react';
import { InviteActivate } from './invite-activate';

export default function InvitePage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pk-bg font-sans text-pk-sub">
          Cargando…
        </div>
      }
    >
      <InviteActivate />
    </Suspense>
  );
}
