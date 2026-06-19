# Automatic bank sync (moey! / Crédito Agrícola)

The *truly automatic* moey! capture: instead of tapping a Shortcut, Saldo pulls your
Crédito Agrícola / moey! transactions itself and drops them in the **Inbox** to categorize.
It uses **[Enable Banking](https://enablebanking.com)** — a PSD2 account-information
aggregator that's **free for personal use** and supports Crédito Agrícola.

Read-only: it can *see* transactions, never move money.

> Why not GoCardless/Nordigen? GoCardless **closed Bank Account Data to new signups in
> July 2025**, so Enable Banking is the working free path now.

---

## 1. Register an Enable Banking app (one time, ~10 min)

1. Sign in at <https://enablebanking.com/sign-in/> (Google or email — free).
2. Open the **Control Panel** → **API applications** → **Create new application**.
3. Choose environment **Production** (so you can connect your real account), and let the
   browser **generate the key pair**. It downloads a file named `<application-id>.pem` to
   your Downloads — **keep it safe, it's your private key.**
4. Copy the **Application ID** (a UUID) shown for the app.

> Enable Banking is free for personal use on your own accounts. If the app needs activating
> for production, follow their prompt to whitelist your own bank account.

## 2. Put the credentials on the server

The private key must go into env as one line, so base64-encode it. On the Proxmox host
(or your machine), in the folder with the `.pem`:

```bash
base64 -w0 saldo-<application-id>.pem        # macOS: base64 -i saldo-<application-id>.pem
```

Copy the long output. Then in the Saldo `.env`:

```bash
ENABLEBANKING_APP_ID=<the application UUID>
ENABLEBANKING_PEM_BASE64=<the base64 blob from above>
```

Confirm `NEXT_PUBLIC_APP_URL` is your real origin (e.g. `https://saldo.torpasweb.com`) — the
bank redirects back to `…/api/banking/callback`. Then recreate the app:

```bash
docker compose up -d
```

## 3. Connect your bank (in the app)

1. Open **Settings → Bank**.
2. **Connect a bank** → pick **Crédito Agrícola** (it's pre-selected) → **Continue to bank**.
3. You're sent to the bank's secure consent page — log in to moey! / CA and approve.
4. You land back in Settings, now showing the linked account(s).

## 4. It syncs itself

- A background job pulls new transactions **every 8 hours** into the Inbox.
- Hit **Sync now** in Settings → Bank anytime to pull immediately.
- New transactions land **pending** in the Inbox; categorize once and the merchant/ID is
  remembered, so the same shop auto-categorizes next time.

## Good to know

- **Consent expires ~every 90 days** (bank rule). When it lapses, the connection shows an
  error — just **Connect a bank** again to re-approve. No data is lost.
- **Disable anytime:** remove the connection in Settings, or blank the `ENABLEBANKING_*`
  vars. The one-tap moey! Shortcut keeps working regardless.
- **Money signs:** bank debits import as expenses, credits as income — matching how you add
  them by hand.
- **Privacy:** the `.pem` private key is yours; it stays on your server and signs short-lived
  tokens. Never commit it — only `ENABLEBANKING_PEM_BASE64` in `.env` (which is git-ignored).
