import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { recordAnalyticsEvent } from "./internal-analytics";

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "";
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || "";
const googleRedirectUri =
  process.env.GOOGLE_REDIRECT_URI || process.env.REDIRECT_URI || "";

const providers: NextAuthOptions["providers"] = [
  ...(googleClientId && googleClientSecret
    ? [
        GoogleProvider({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          ...(googleRedirectUri
            ? {
                authorization: {
                  params: {
                    redirect_uri: googleRedirectUri,
                  },
                },
              }
            : {}),
        }),
      ]
    : []),
  CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, image: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.picture = dbUser.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).image = token.picture;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      if (!user?.id || !account?.provider || !isNewUser) return;
      if (!["google"].includes(account.provider)) return;

      await recordAnalyticsEvent({
        eventName: "auth_signup_completed",
        userId: user.id,
        properties: {
          method: account.provider,
          oauth_signup: true,
        },
      });
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};
