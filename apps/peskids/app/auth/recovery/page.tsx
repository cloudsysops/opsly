import { redirect } from 'next/navigation';
import { AuthRecoveryHandler } from '@/components/auth/auth-recovery-handler';
import { exchangeAuthCodeOnServer } from '@/lib/auth-server-exchange';
import { resolveLoginPath, resolveRecoveryUpdatePath } from '@/lib/auth-callback';
import { recoveryExchangeErrorMessage } from '@/lib/auth-recovery-messages';

type Props = {
  searchParams: Promise<{ code?: string; next?: string }>;
};

export default async function AuthRecoveryPage({
  searchParams,
}: Props): Promise<React.ReactElement> {
  const params = await searchParams;
  const code = params.code?.trim();
  const nextParam = params.next?.trim();
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : null;
  const loginPath = resolveLoginPath(nextPath ?? '/admin/update-password');

  if (code) {
    const result = await exchangeAuthCodeOnServer(code);
    if (!result.ok) {
      const message =
        'message' in result.error
          ? recoveryExchangeErrorMessage(result.error.message)
          : 'auth_error';
      redirect(`${loginPath}?error=${encodeURIComponent(message)}`);
    }
    redirect(resolveRecoveryUpdatePath(result.user, nextPath));
  }

  return <AuthRecoveryHandler updatePasswordPath={nextPath ?? undefined} />;
}
