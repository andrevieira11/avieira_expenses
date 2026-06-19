import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import { user, session, account, verification } from "@/db/schema";
import { createPersonalBook } from "@/lib/queries/books";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? appUrl,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),

  emailAndPassword: {
    enabled: true,
    // Self-hosted single user; no mail server wired yet.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  // The browser's Origin is the public HTTPS host (never the internal app:3000),
  // so it must be trusted for the CSRF/Origin check to pass behind Caddy.
  trustedOrigins: [appUrl],

  advanced: {
    // Derive scheme/host from Caddy's X-Forwarded-* headers.
    trustedProxyHeaders: true,
    // TLS is terminated at Caddy; force Secure cookies in prod, allow http in dev.
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },

  databaseHooks: {
    user: {
      create: {
        // On signup, give the new user their personal book seeded with categories.
        after: async (createdUser) => {
          await createPersonalBook(createdUser.id);
        },
      },
    },
  },

  // nextCookies must be the LAST plugin so it can set cookies after other handlers.
  plugins: [nextCookies()],
});
