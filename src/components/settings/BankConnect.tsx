"use client";

import { useState, useTransition } from "react";
import { Landmark, RefreshCw, Plug, Unplug, Loader2, Check } from "lucide-react";
import {
  getInstitutions,
  connectBank,
  syncNow,
  disconnectBank,
} from "@/lib/actions/banking";
import type { BankConnectionWithAccounts } from "@/lib/queries/banking";
import { cn } from "@/lib/utils";

type Institution = { id: string; name: string; logo?: string };

function timeAgo(d: Date | null): string {
  if (!d) return "never";
  const secs = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function BankConnect({
  connections,
}: {
  connections: BankConnectionWithAccounts[];
}) {
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [selected, setSelected] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  async function openPicker() {
    setError(null);
    setLoadingList(true);
    const res = await getInstitutions();
    setLoadingList(false);
    if (!res.ok) {
      if (res.error === "not_configured") setNotConfigured(true);
      else setError(res.error);
      return;
    }
    setInstitutions(res.institutions);
    // Pre-select Crédito Agrícola if it's in the list.
    const ca = res.institutions.find((i) =>
      i.name.toLowerCase().includes("agr"),
    );
    setSelected(ca?.id ?? res.institutions[0]?.id ?? "");
  }

  function connect() {
    const inst = institutions?.find((i) => i.id === selected);
    if (!inst) return;
    startTransition(async () => {
      const res = await connectBank(inst.id, inst.name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.link; // hosted bank consent
    });
  }

  function sync() {
    setError(null);
    setSynced(null);
    startTransition(async () => {
      const res = await syncNow();
      if (!res.ok) setError(res.error);
      else setSynced(res.imported);
    });
  }

  function disconnect(id: string) {
    startTransition(async () => {
      await disconnectBank(id);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {connections.length > 0 && (
        <ul className="space-y-2">
          {connections.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-2xl border border-hairline bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  <Landmark className="h-4 w-4 shrink-0 text-brand" />
                  {c.institutionName}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {c.status === "linked" ? (
                    <>
                      {c.accounts.length} account
                      {c.accounts.length === 1 ? "" : "s"} · synced{" "}
                      {timeAgo(
                        c.accounts
                          .map((a) => a.lastSyncedAt)
                          .filter(Boolean)
                          .sort()
                          .at(-1) ?? null,
                      )}
                    </>
                  ) : c.status === "error" ? (
                    <span className="text-over">connection error</span>
                  ) : (
                    "awaiting consent…"
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => disconnect(c.id)}
                disabled={pending}
                className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-hairline px-2.5 py-1.5 text-xs text-muted transition hover:text-over disabled:opacity-40"
              >
                <Unplug className="h-3.5 w-3.5" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {connections.some((c) => c.status === "linked") && (
        <button
          type="button"
          onClick={sync}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync now
        </button>
      )}

      {synced != null && (
        <p className="flex items-center gap-1.5 text-sm text-good">
          <Check className="h-4 w-4" />
          {synced === 0
            ? "Up to date — nothing new."
            : `Imported ${synced} new transaction${synced === 1 ? "" : "s"} to the inbox.`}
        </p>
      )}

      {/* Add a connection */}
      {institutions == null ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={loadingList}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loadingList ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plug className="h-4 w-4" />
          )}
          Connect a bank
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-muted"
          >
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={connect}
            disabled={pending || !selected}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50",
            )}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue to bank
          </button>
        </div>
      )}

      {notConfigured && (
        <p className="text-xs text-muted">
          Bank sync isn&apos;t configured yet. Add{" "}
          <code className="rounded bg-surface-2 px-1">ENABLEBANKING_APP_ID</code>{" "}
          and{" "}
          <code className="rounded bg-surface-2 px-1">
            ENABLEBANKING_PEM_BASE64
          </code>{" "}
          to the server, then reload.
        </p>
      )}
      {error && <p className="text-sm text-over">{error}</p>}
    </div>
  );
}
