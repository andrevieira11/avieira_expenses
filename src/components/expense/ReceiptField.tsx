"use client";

import { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";

export function ReceiptField({ txId }: { txId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState(0);
  const [hasReceipt, setHasReceipt] = useState(true); // optimistic; img onError corrects
  const [busy, setBusy] = useState(false);

  const src = `/api/receipts/${txId}?v=${version}`;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("transactionId", txId);
    fd.append("file", file);
    const res = await fetch("/api/receipts", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      setHasReceipt(true);
      setVersion((v) => v + 1);
    }
    e.target.value = "";
  }

  return (
    <div>
      {hasReceipt && (
        <a href={src} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Receipt"
            onError={() => setHasReceipt(false)}
            className="max-h-40 rounded-xl border border-hairline object-contain"
          />
        </a>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-hairline px-3 py-1.5 text-sm transition hover:bg-surface-2 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        {hasReceipt ? "Change receipt" : "Attach receipt"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}
