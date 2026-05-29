import { auth, signOut, authEnabled } from '@/auth';
import Image from 'next/image';

export default async function AuthBar() {
  if (!authEnabled) {
    return <span className="text-xs text-zinc-600 italic">Auth: dev mode (sin Google)</span>;
  }

  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {session.user.image && (
        <Image
          src={session.user.image}
          alt={session.user.name ?? 'User'}
          width={28}
          height={28}
          className="rounded-full"
        />
      )}
      <span className="text-sm text-zinc-400 hidden sm:block">{session.user.email}</span>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      >
        <button
          type="submit"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
