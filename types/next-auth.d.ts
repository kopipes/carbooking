// NextAuth type augmentation
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "MANAGER" | "USER";
      divisionId: number;
      divisionName: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "MANAGER" | "USER";
    divisionId: number;
    divisionName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "MANAGER" | "USER";
    divisionId: number;
    divisionName: string;
  }
}
