// Enable Banking (PSD2 account-information aggregator) API client.
// Free for personal use; supports Crédito Agrícola / moey!. Docs: https://enablebanking.com/docs/api
// Auth = a short-lived RS256 JWT signed with the application's private key (no token exchange).
import { createSign } from "node:crypto";

const BASE = "https://api.enablebanking.com";

export function ebConfigured(): boolean {
  return !!(
    process.env.ENABLEBANKING_APP_ID &&
    (process.env.ENABLEBANKING_PEM_BASE64 || process.env.ENABLEBANKING_PEM)
  );
}

/** The RSA private key (the .pem downloaded when registering the app). */
function getPrivateKey(): string {
  const b64 = process.env.ENABLEBANKING_PEM_BASE64;
  if (b64) return Buffer.from(b64, "base64").toString("utf8");
  const raw = process.env.ENABLEBANKING_PEM;
  if (raw) return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  throw new Error("Enable Banking key not configured");
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

let jwtCache: { token: string; exp: number } | null = null;

function jwt(): string {
  if (jwtCache && jwtCache.exp > Date.now() + 60_000) return jwtCache.token;
  const appId = process.env.ENABLEBANKING_APP_ID;
  if (!appId) throw new Error("ENABLEBANKING_APP_ID not set");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1h (max allowed is 24h)
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "RS256", kid: appId }));
  const body = b64url(
    JSON.stringify({
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat: now,
      exp,
    }),
  );
  const signingInput = `${header}.${body}`;
  const sig = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(getPrivateKey(), "base64url");
  const token = `${signingInput}.${sig}`;
  jwtCache = { token, exp: exp * 1000 };
  return token;
}

async function eb<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = json as { message?: string; error?: string; detail?: string };
    throw new Error(
      err?.message || err?.error || err?.detail || `Enable Banking ${res.status}`,
    );
  }
  return json as T;
}

export type Aspsp = { name: string; country: string; logo?: string };

export async function listAspsps(country = "PT"): Promise<Aspsp[]> {
  const data = await eb<{ aspsps: Aspsp[] }>(
    `/aspsps?country=${country}&psu_type=personal`,
  );
  return data.aspsps ?? [];
}

/** Start a consent flow; returns the bank URL to redirect the user to. */
export async function startAuth(params: {
  aspspName: string;
  country: string;
  redirectUrl: string;
  state: string;
}): Promise<{ url: string; authorization_id: string }> {
  // Consent validity (bank-capped at ~90 days). Format with microseconds + offset.
  const validUntil = new Date(Date.now() + 89 * 86_400_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, ".000000+00:00");
  return eb(`/auth`, {
    method: "POST",
    body: JSON.stringify({
      access: { valid_until: validUntil },
      aspsp: { name: params.aspspName, country: params.country },
      redirect_url: params.redirectUrl,
      state: params.state,
      psu_type: "personal",
    }),
  });
}

export type EbAccount = {
  uid: string;
  account_id?: { iban?: string } | string;
  name?: string;
  currency?: string;
};

export async function createSession(
  code: string,
): Promise<{ session_id: string; accounts: EbAccount[] }> {
  return eb(`/sessions`, { method: "POST", body: JSON.stringify({ code }) });
}

export type EbTransaction = {
  transaction_id?: string;
  entry_reference?: string;
  transaction_amount: { amount: string; currency: string };
  credit_debit_indicator?: "CRDT" | "DBIT";
  status?: string;
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
};

/** All transactions for an account since `dateFrom` (YYYY-MM-DD), following pagination. */
export async function getAccountTransactions(
  uid: string,
  dateFrom: string,
): Promise<EbTransaction[]> {
  const out: EbTransaction[] = [];
  let key: string | undefined;
  for (let page = 0; page < 6; page++) {
    const qs = new URLSearchParams({ date_from: dateFrom });
    if (key) qs.set("continuation_key", key);
    const data = await eb<{
      transactions?: EbTransaction[];
      continuation_key?: string;
    }>(`/accounts/${uid}/transactions?${qs.toString()}`);
    out.push(...(data.transactions ?? []));
    if (!data.continuation_key) break;
    key = data.continuation_key;
  }
  return out;
}
