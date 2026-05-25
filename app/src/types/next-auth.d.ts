import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      tier: string;
      suspended: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    suspended?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tier: string;
    suspended: boolean;
    /** Set when an admin is impersonating this user; never appears on the actor's own session. */
    impersonatedBy?: string;
  }
}
