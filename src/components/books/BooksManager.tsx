"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, UserMinus, LogOut, Link2 } from "lucide-react";
import {
  createBook,
  createInvite,
  leaveBook,
  removeMember,
} from "@/lib/actions/books-manage";
import { cn } from "@/lib/utils";
import type { DetailedBook, BookMemberRow } from "@/lib/queries/books-manage";

export function BooksManager({
  books,
  members,
}: {
  books: DetailedBook[];
  members: BookMemberRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"personal" | "shared">("shared");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    await createBook({ name: name.trim(), type });
    setName("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-3xl border border-hairline bg-surface p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Book name (e.g. Home)"
          maxLength={60}
          className="w-full rounded-xl border border-hairline bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
        />
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-hairline bg-bg p-1 text-sm">
            {(["personal", "shared"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-medium transition",
                  type === t ? "bg-fg text-bg" : "text-muted",
                )}
              >
                {t === "personal" ? "Personal" : "Shared"}
              </button>
            ))}
          </div>
          <button
            onClick={create}
            disabled={busy}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create book
          </button>
        </div>
      </div>

      {books.map((b) => (
        <BookCard
          key={b.id}
          book={b}
          members={members.filter((m) => m.bookId === b.id)}
        />
      ))}
    </div>
  );
}

function BookCard({
  book,
  members,
}: {
  book: DetailedBook;
  members: BookMemberRow[];
}) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const isOwner = book.role === "owner";

  async function invite() {
    setBusy(true);
    const res = await createInvite(book.id, "");
    setBusy(false);
    if (res.ok) setLink(`${window.location.origin}/invite/${res.token}`);
  }
  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function leave() {
    setBusy(true);
    await leaveBook(book.id);
    router.refresh();
  }
  async function kick(userId: string) {
    setBusy(true);
    await removeMember(book.id, userId);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-hairline bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{book.name}</p>
          <p className="text-xs text-muted">
            {book.type === "shared" ? "Shared" : "Personal"} ·{" "}
            {isOwner ? "Owner" : "Member"}
          </p>
        </div>
        {!isOwner && (
          <button
            onClick={leave}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-hairline px-3 py-1.5 text-sm text-over transition hover:bg-surface-2"
          >
            <LogOut className="h-4 w-4" />
            Leave
          </button>
        )}
      </div>

      {members.length > 1 && (
        <div className="mt-3 space-y-1.5 border-t border-hairline pt-3">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between text-sm">
              <span className="truncate">
                {m.name}
                {m.role === "owner" && (
                  <span className="ml-1 text-xs text-muted">(owner)</span>
                )}
              </span>
              {isOwner && m.role !== "owner" && (
                <button
                  onClick={() => kick(m.userId)}
                  disabled={busy}
                  className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-over"
                  aria-label="Remove"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="mt-3 border-t border-hairline pt-3">
          {link ? (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-xl border border-hairline bg-bg px-3 py-1.5 text-xs"
              />
              <button
                onClick={copy}
                className="grid h-8 w-8 place-items-center rounded-xl border border-hairline hover:bg-surface-2"
                aria-label="Copy"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-good" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={invite}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2"
            >
              <Link2 className="h-4 w-4" />
              Generate invite link
            </button>
          )}
          <p className="mt-2 text-xs text-muted">
            Share the link. Anyone who opens it and signs in joins this book.
          </p>
        </div>
      )}
    </div>
  );
}
