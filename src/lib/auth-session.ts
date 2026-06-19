import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Server-side session, deduped per request. Returns { user, session } or null.
 * Use in server components / actions to gate access and resolve the current user.
 */
export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
