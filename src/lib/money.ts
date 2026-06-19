/**
 * Money helpers. The app stores integer cents everywhere; formatting happens ONLY here
 * at the UI edge. Default locale pt-PT, currency EUR.
 */

const formatters = new Map<string, Intl.NumberFormat>();

function fmt(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("pt-PT", { style: "currency", currency });
    formatters.set(currency, f);
  }
  return f;
}

/** Format integer cents as currency, e.g. 1234 -> "12,34 €". Null -> em dash. */
export function formatMoney(
  cents: number | null | undefined,
  currency = "EUR",
): string {
  if (cents == null) return "—";
  return fmt(currency).format(cents / 100);
}

/** Format a signed amount with an explicit leading sign (for ledgers). */
export function formatSignedMoney(
  cents: number | null | undefined,
  currency = "EUR",
): string {
  if (cents == null) return "—";
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  return `${sign}${fmt(currency).format(Math.abs(cents) / 100)}`;
}

/** Convert a decimal euro amount (e.g. 12.34) to integer cents, rounding safely. */
export function toCents(euros: number): number {
  return Math.round(euros * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** cents -> euro input string (comma decimal), "" when null. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** euro input string -> integer cents, or null when blank/invalid. */
export function euroInputToCents(s: string): number | null {
  const t = s.trim().replace(/[\s€]/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
