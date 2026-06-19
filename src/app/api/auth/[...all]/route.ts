import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth runs on the Node.js runtime (needs crypto + the pg driver).
export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
