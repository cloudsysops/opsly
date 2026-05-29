import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Auth is enabled only when Google credentials AND a secret are present.
// Without credentials the dashboard/analytics are open (dev/demo mode).
export const authEnabled =
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()) &&
  Boolean(process.env.AUTH_SECRET?.trim());

export const { handlers, signIn, signOut, auth } = NextAuth({
  // next-auth v5 reads AUTH_SECRET automatically; provide fallback so build doesn't crash
  secret: process.env.AUTH_SECRET ?? 'dev-placeholder-not-used',
  providers: authEnabled
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth: session, request }) {
      if (!authEnabled) return true;
      const isProtected =
        request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/analytics');
      return isProtected ? Boolean(session) : true;
    },
  },
});
