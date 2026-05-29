import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const authEnabled =
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());

export const { handlers, signIn, signOut, auth } = NextAuth({
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

export { authEnabled };
