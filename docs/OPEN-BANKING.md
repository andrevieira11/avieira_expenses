# Automatic bank sync (moey! / Crédito Agrícola)

This is the *truly automatic* moey! capture: instead of tapping a Shortcut, Saldo pulls
your Crédito Agrícola / moey! transactions itself and drops them in the **Inbox** for you
to categorize. It uses **GoCardless Bank Account Data** (the free, read-only Open Banking
API, ex-Nordigen — Crédito Agrícola is supported).

Read-only: GoCardless can *see* transactions, never move money.

---

## 1. Get free GoCardless secrets (one time, ~5 min)

1. Sign up at <https://bankaccountdata.gocardless.com/> (free — 50 connections/month).
2. Verify your email and log in.
3. Go to **Developers → User secrets → Create new**.
4. Copy the **Secret ID** and **Secret key** (the key is shown once — copy it now).

## 2. Add them to the server

On the Proxmox host, in the Saldo `.env`:

```bash
GOCARDLESS_SECRET_ID=xxxxxxxx-....
GOCARDLESS_SECRET_KEY=yyyyyyyy-....
```

Then recreate the app so it picks them up:

```bash
docker compose up -d
```

(`NEXT_PUBLIC_APP_URL` must be your real origin, e.g. `https://saldo.torpasweb.com` — the
bank redirects back to `…/api/banking/callback`.)

## 3. Connect your bank (in the app)

1. Open **Settings → Bank**.
2. **Connect a bank** → pick **Crédito Agrícola** (it's pre-selected) → **Continue to bank**.
3. You're sent to the bank's secure consent page — log in to moey! / CA and approve.
4. You land back in Settings, now showing the linked account(s).

## 4. It syncs itself

- A background job pulls new transactions **every 8 hours** into the Inbox.
- Hit **Sync now** in Settings → Bank anytime to pull immediately.
- New transactions land as **pending** in the Inbox; categorize them once and the
  merchant/ID is remembered, so the same shop auto-categorizes next time.

## Good to know

- **Consent expires every 90 days** (bank rule). When it lapses, the connection shows an
  error — just **Connect a bank** again to re-approve. No data is lost.
- **Free-tier rate limit:** ~4 transaction fetches per account per day. The 8-hour cron
  uses 3/day, leaving one for manual syncs.
- **Disable anytime:** remove the connection in Settings, or blank the `GOCARDLESS_*`
  secrets. The one-tap moey! Shortcut keeps working regardless.
- **Money signs:** bank debits import as expenses, credits as income — matching how you
  add them by hand.
