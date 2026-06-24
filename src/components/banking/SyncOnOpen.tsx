"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { syncOnOpen } from "@/lib/actions/banking";

const KEY = "saldo:lastBankSync";
const MIN_MS = 15 * 60 * 1000; // don't re-pull more than every 15 min

/**
 * Pulls bank transactions whenever the app is opened or brought to the foreground
 * (throttled), so the inbox is fresh the moment you look — no waiting for the 8h cron.
 * User-present syncs like this are allowed far more often than unattended background ones.
 * Renders nothing.
 */
export function SyncOnOpen() {
  const router = useRouter();
  const running = useRef(false);

  useEffect(() => {
    async function maybeSync() {
      if (running.current) return;
      const last = Number(localStorage.getItem(KEY) || 0);
      if (Date.now() - last < MIN_MS) return;
      running.current = true;
      localStorage.setItem(KEY, String(Date.now())); // optimistic throttle
      try {
        const res = await syncOnOpen();
        if (res.ok && res.imported > 0) router.refresh();
      } catch {
        // silent — never disrupt the UI for a background pull
      } finally {
        running.current = false;
      }
    }

    maybeSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") maybeSync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  return null;
}
