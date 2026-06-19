// GoCardless Bank Account Data (ex-Nordigen) API client.
// Docs: https://developer.gocardless.com/bank-account-data
const BASE = "https://bankaccountdata.gocardless.com/api/v2";

let cachedToken: { access: string; exp: number } | null = null;

export function gcConfigured(): boolean {
  return !!(
    process.env.GOCARDLESS_SECRET_ID && process.env.GOCARDLESS_SECRET_KEY
  );
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) {
    return cachedToken.access;
  }
  const res = await fetch(`${BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret_id: process.env.GOCARDLESS_SECRET_ID,
      secret_key: process.env.GOCARDLESS_SECRET_KEY,
    }),
  });
  if (!res.ok) throw new Error(`GoCardless auth failed (${res.status})`);
  const data = (await res.json()) as { access: string; access_expires: number };
  cachedToken = {
    access: data.access,
    exp: Date.now() + (data.access_expires ?? 3600) * 1000,
  };
  return data.access;
}

async function gc<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
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
    const err = json as { detail?: string; summary?: string };
    throw new Error(err?.detail || err?.summary || `GoCardless ${res.status}`);
  }
  return json as T;
}

export type Institution = {
  id: string;
  name: string;
  logo?: string;
  bic?: string;
};

export function listInstitutions(country = "PT") {
  return gc<Institution[]>(`/institutions/?country=${country}`);
}

export function createAgreement(institutionId: string) {
  return gc<{ id: string }>(`/agreements/enduser/`, {
    method: "POST",
    body: JSON.stringify({
      institution_id: institutionId,
      max_historical_days: 90,
      access_valid_for_days: 90,
      access_scope: ["balances", "details", "transactions"],
    }),
  });
}

export function createRequisition(params: {
  institutionId: string;
  agreementId: string;
  redirect: string;
  reference: string;
}) {
  return gc<{ id: string; link: string }>(`/requisitions/`, {
    method: "POST",
    body: JSON.stringify({
      institution_id: params.institutionId,
      agreement: params.agreementId,
      redirect: params.redirect,
      reference: params.reference,
      user_language: "EN",
    }),
  });
}

export function getRequisition(id: string) {
  return gc<{ id: string; status: string; accounts: string[] }>(
    `/requisitions/${id}/`,
  );
}

export type GcTransaction = {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: { amount: string; currency: string };
  remittanceInformationUnstructured?: string;
  creditorName?: string;
  debtorName?: string;
};

export async function getAccountTransactions(accountId: string) {
  const data = await gc<{
    transactions?: { booked?: GcTransaction[]; pending?: GcTransaction[] };
  }>(`/accounts/${accountId}/transactions/`);
  return {
    booked: data.transactions?.booked ?? [],
    pending: data.transactions?.pending ?? [],
  };
}
