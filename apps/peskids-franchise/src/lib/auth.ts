import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { db } from "./db";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
  interface User {
    role: UserRole;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // Google OAuth for admin users (@acmefranchise.com)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          hd: "acmefranchise.com", // Restrict to domain
        },
      },
    }),
    // Email/password for prospects
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Demo mode: accept demo credentials without DB lookup
        if (email === "demo@acmefranchise.com" && password === "demo") {
          return {
            id: "demo-user",
            email: "demo@acmefranchise.com",
            name: "Demo User",
            role: "ADMIN" as UserRole,
          };
        }

        // Check if this is a prospect
        const prospect = await db.prospect.findUnique({
          where: { email },
        });

        if (!prospect || !prospect.passwordHash) {
          return null;
        }

        const isValid = await compare(password, prospect.passwordHash);
        if (!isValid) {
          return null;
        }

        // Log the login activity
        await db.prospectActivity.create({
          data: {
            prospectId: prospect.id,
            activityType: "LOGIN",
            description: "Prospect logged into portal",
          },
        });

        return {
          id: prospect.id,
          email: prospect.email,
          name: `${prospect.firstName} ${prospect.lastName}`,
          role: "PROSPECT" as UserRole,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth, verify it's a @acmefranchise.com email
      if (account?.provider === "google") {
        if (!user.email?.endsWith("@acmefranchise.com")) {
          return false;
        }

        try {
          // Check if this is a SELECTED franchisee — they get PROSPECT role, not ADMIN
          const prospect = await db.prospect.findFirst({
            where: { email: user.email, pipelineStage: "SELECTED" },
          });

          if (!prospect) {
            // Genuine admin — upgrade User role if needed
            const dbUser = await db.user.findUnique({
              where: { email: user.email },
            });
            if (dbUser && dbUser.role === "PROSPECT") {
              await db.user.update({
                where: { email: user.email },
                data: { role: "ADMIN" },
              });
            }
          }
        } catch (err) {
          console.error("Error in signIn callback:", err);
          // Still allow sign-in — role will be resolved in jwt callback
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.picture = user.image;
        token.name = user.name;
      }
      // On initial Google sign-in, determine role based on whether they're a franchisee
      if (account?.provider === "google" && token.email?.endsWith("@acmefranchise.com")) {
        try {
          const prospect = await db.prospect.findFirst({
            where: { email: token.email as string, pipelineStage: "SELECTED" },
          });

          if (prospect) {
            // Franchisee — use PROSPECT role with prospect ID so portal works
            token.role = "PROSPECT" as UserRole;
            token.id = prospect.id;
            token.name = `${prospect.firstName} ${prospect.lastName}`;
          } else {
            // Genuine admin
            token.role = "ADMIN" as UserRole;
            try {
              await db.user.update({
                where: { email: token.email as string },
                data: { role: "ADMIN" },
              });
            } catch {
              // User may not be created yet by adapter
            }
          }
        } catch (err) {
          console.error("Error in jwt callback:", err);
          // Default to ADMIN for @acmefranchise.com users if DB lookup fails
          token.role = "ADMIN" as UserRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as UserRole;
        session.user.id = token.id as string;
        session.user.image = token.picture as string | null;
        session.user.name = token.name as string | null;
      }
      return session;
    },
  },
});
