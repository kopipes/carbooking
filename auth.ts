import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { division: true },
        });
        if (!user || !user.active) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role as "ADMIN" | "MANAGER" | "USER",
          divisionId: user.divisionId,
          divisionName: user.division?.name ?? "",
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.divisionId = user.divisionId;
        token.divisionName = user.divisionName;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id           = token.id as string;
      session.user.role         = token.role as "ADMIN" | "MANAGER" | "USER";
      session.user.divisionId   = token.divisionId as number;
      session.user.divisionName = token.divisionName as string;
      return session;
    },
  },
});
