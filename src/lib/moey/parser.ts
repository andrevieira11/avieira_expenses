/**
 * Best-effort parser for moey! (Crédito Agrícola) push-notification text, in Portuguese.
 * Amount + direction + "is this even a transaction" are the load-bearing fields; merchant
 * is soft (null is fine). Never throws — an unparseable amount still yields a result the
 * inbox surfaces for manual fixing. Tune the keyword lists once real samples are collected.
 */

export type MoeyParseResult = {
  amountCents: number | null;
  currency: string;
  merchant: string | null;
  type: "expense" | "refund" | null;
  occurredAt: string | null; // "YYYY-MM-DD" when a full date is present, else null
  ignored: boolean; // balance alert / OTP / declined / login — not a spend
  parseOk: boolean; // an amount was found
};

const pad = (n: number) => String(n).padStart(2, "0");

// Non-transaction notifications we must NOT turn into expenses.
const IGNORE = [
  "saldo",
  "codigo",
  "código",
  "otp",
  "recusad", // recusada/recusado
  "nao autorizad",
  "não autorizad",
  "cartao bloquead",
  "cartão bloquead",
  "login",
  "sessao",
  "sessão",
  "tentativa de",
];

// Money coming back in.
const CREDIT = [
  "reembolso",
  "estorno",
  "devolucao",
  "devolução",
  "credito",
  "crédito",
  "recebid", // recebido/recebida
  "transferencia recebida",
  "transferência recebida",
];

const EMPTY: MoeyParseResult = {
  amountCents: null,
  currency: "EUR",
  merchant: null,
  type: null,
  occurredAt: null,
  ignored: false,
  parseOk: false,
};

function extractAmount(text: string): { cents: number; end: number } | null {
  // Prefer a number anchored to € / EUR (avoids grabbing card digits / dates).
  const anchored =
    /(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s?(?:€|eur)\b/i.exec(text) ??
    /\b(?:eur|€)\s?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/i.exec(text);
  const match =
    anchored ??
    /(?<![\d.,])(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})(?![\d])/.exec(text);
  if (!match) return null;
  const cents = parseInt(match[1].replace(/\./g, "") + match[2], 10);
  return { cents, end: match.index + match[0].length };
}

function extractMerchant(rest: string): string | null {
  const m = /\b(?:em|na|no|a|de)\s+(.+?)(?:\s+(?:\d{1,2}[/.\-]\d{1,2}|cart[aã]o|\*{2,}\d{2,})|[.,;]|$)/i.exec(
    rest,
  );
  if (!m) return null;
  const cleaned = m[1].replace(/\s+/g, " ").trim();
  return cleaned.length ? cleaned : null;
}

function extractDate(text: string): string | null {
  const d = /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/.exec(text);
  if (!d) return null;
  const dd = Number(d[1]);
  const mm = Number(d[2]);
  let yy = Number(d[3]);
  if (yy < 100) yy += 2000;
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
  return `${yy}-${pad(mm)}-${pad(dd)}`;
}

export function parseMoeyNotification(raw: string): MoeyParseResult {
  const text = (raw ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  if (!text) return { ...EMPTY };

  const lower = text.toLowerCase();

  if (IGNORE.some((k) => lower.includes(k))) {
    return { ...EMPTY, ignored: true };
  }

  const amount = extractAmount(text);
  const type: "expense" | "refund" = CREDIT.some((k) => lower.includes(k))
    ? "refund"
    : "expense";
  const merchant = extractMerchant(
    amount ? text.slice(amount.end) : text,
  );

  return {
    amountCents: amount?.cents ?? null,
    currency: "EUR",
    merchant,
    type,
    occurredAt: extractDate(text),
    ignored: false,
    parseOk: amount != null,
  };
}
