import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import { getAuthPublicConfig } from '@/lib/auth-public-config';
import { AdminLoginForm } from './admin-login-form';

export default function AdminLoginPage(): React.ReactElement {
  const authConfig = getAuthPublicConfig();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pk-bg">
          <Loader2 className="h-8 w-8 animate-spin text-pk-mint" aria-hidden />
        </div>
      }
    >
      <AdminLoginForm authConfig={authConfig} />
    </Suspense>
  );
}
