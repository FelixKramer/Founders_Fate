import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashEmailForIndex } from "@/lib/email-index";
import type { UserRole } from "@prisma/client";

function parseAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        if (user.suspended) {
          throw new Error("Account suspended");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          suspended: user.suspended,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  events: {
    /**
     * Runs once on first user creation (OAuth or credentials). Used to:
     *  1. Backfill emailHash via bcrypt+pepper (FR review D-02).
     *  2. Auto-promote to admin if email is in ADMIN_EMAILS.
     *
     * Subsequent admin grants must go through the /admin UI so they're audited.
     */
    async createUser({ user }) {
      if (!user.email) return;
      const adminEmails = parseAdminEmails();
      const isAdmin = adminEmails.has(user.email.toLowerCase());
      const emailHash = await hashEmailForIndex(user.email);
      await db.user.update({
        where: { id: user.id },
        data: {
          emailHash,
          ...(isAdmin ? { role: "admin" } : {}),
        },
      });
    },
  },
  callbacks: {
    async signIn({ user }) {
      // Block suspended accounts from completing sign-in.
      if (!user.email) return true;
      const dbUser = await db.user.findUnique({
        where: { email: user.email },
        select: { suspended: true },
      });
      if (dbUser?.suspended) return false;
      return true;
    },
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.tier = token.tier;
        session.user.suspended = token.suspended;
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      // On initial login the `user` arg is populated; rebuild from db on every refresh
      // so role/tier/suspended stay current without forcing a logout cycle.
      const dbUser = await db.user.findFirst({
        where: { email: token.email! },
        include: {
          profile: { select: { tier: true } },
        },
      });

      if (!dbUser) {
        if (user) token.id = user.id;
        token.role = (token.role ?? "user") as UserRole;
        token.tier = (token.tier ?? "free") as string;
        token.suspended = (token.suspended ?? false) as boolean;
        return token;
      }

      token.id = dbUser.id;
      token.name = dbUser.name;
      token.email = dbUser.email;
      token.picture = dbUser.image;
      token.role = dbUser.role;
      token.suspended = dbUser.suspended;
      token.tier = dbUser.profile?.tier ?? "free";

      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
