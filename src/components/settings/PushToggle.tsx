"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  // undefined = loading, null = unavailable
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<"off" | "on" | "busy">("off");

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await fetch("/api/push/public-key").then((r) => r.json());
        if (cancelled) return;
        setKey(d.key);
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setKey(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  async function enable() {
    if (!key) return;
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setState("on");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } finally {
      setState("off");
    }
  }

  async function test() {
    await fetch("/api/push/test", { method: "POST" });
  }

  if (!supported || key === null)
    return (
      <p className="text-sm text-muted">
        Notificações indisponíveis aqui. No iPhone, adiciona o Saldo ao ecrã
        principal primeiro.
      </p>
    );
  if (key === undefined) return <div className="h-9" />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "on" ? (
        <>
          <button
            onClick={disable}
            className="inline-flex items-center gap-2 rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            <BellOff className="h-4 w-4" />
            Desativar
          </button>
          <button
            onClick={test}
            className="inline-flex items-center gap-2 rounded-xl border border-hairline px-3.5 py-2 text-sm transition hover:bg-surface-2"
          >
            <Send className="h-4 w-4" />
            Testar
          </button>
        </>
      ) : (
        <button
          onClick={enable}
          disabled={state === "busy"}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {state === "busy" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          Ativar notificações
        </button>
      )}
    </div>
  );
}
