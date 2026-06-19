import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. baseURL is intentionally omitted so it targets the current
 * origin — correct in both dev (localhost) and prod (the Caddy domain) without a rebuild.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
