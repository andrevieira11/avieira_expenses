# Capturing moey! transactions on iPhone

## How it works (and the honest limitation)

iOS does **not** let any app or Shortcut read the *text* of another app's push
notification. So a fully automatic "moey! buzzes → expense appears" is not possible on a
stock iPhone. Saldo uses the next best thing — **one-tap capture**:

> A moey! notification arrives → you **share** it (or its text) to the **"Adicionar ao
> Saldo"** Shortcut → the text is POSTed to Saldo, parsed (amount + merchant), and lands
> in your **Inbox** as "waiting for category". Saldo remembers each merchant, so the
> second time it's pre-filled — one tap to confirm.

Two shortcuts: the **Share-sheet** one (daily use) and a **Paste** fallback (always works).

## What you need

- Your app URL, e.g. `https://saldo.your-domain.tld`
- Your `INGEST_WEBHOOK_TOKEN` (from the server's `.env`)

The endpoint:

```
POST  https://saldo.your-domain.tld/api/ingest
Header: Authorization: Bearer <INGEST_WEBHOOK_TOKEN>
Header: Content-Type: application/json
Body:   { "raw_text": "<text>", "external_id": "<optional stable id>", "source": "ios_share" }
```

## Auto-categorize by ID

If a moey! notification exposes a stable identifier — a terminal id, a merchant code, a
transaction reference — pass it as **`external_id`**. The first time you categorize that
capture, Saldo remembers the id → category. Every future transaction with the **same id**
is then auto-categorized (it still lands in the inbox as a one-tap confirm). The id wins
over merchant text, so it's the most reliable match. No id? Saldo falls back to remembering
the **merchant name**. Both are optional — leave `external_id` out if there's nothing stable
to send.

## Shortcut 1 — "Adicionar ao Saldo" (share sheet, primary)

1. **Shortcuts → +** (new). Rename it **"Adicionar ao Saldo"**.
2. Tap the **(i)** → enable **"Show in Share Sheet"** → set **Share Sheet Types** to **Text** only.
3. The shortcut receives **Shortcut Input** (the shared text). "If there's no input": *Continue*.
4. Add a **Text** action → paste your `INGEST_WEBHOOK_TOKEN`. (Stored inside the shortcut,
   which lives in your private, iCloud-synced Shortcuts library. If you ever screenshot/share
   the shortcut, rotate the token on the server.)
5. Add **Get Current Date** → **Format Date** → ISO 8601 (with time).
6. Add **Dictionary**:
   - `raw_text` → *Shortcut Input*
   - `source` → `ios_share`
   - `received_at` → the formatted date
   - `external_id` → *(optional)* a stable id from the notification, if one exists
7. Add **Get Contents of URL**:
   - URL: `https://saldo.your-domain.tld/api/ingest`
   - Method: **POST**
   - Headers: `Authorization` = `Bearer ` + your token text; `Content-Type` = `application/json`
   - Request Body: **JSON** → the Dictionary from step 6
8. (Optional) **Get Dictionary Value** `status` from the response → **Show Notification**
   "Guardado na inbox".
9. Run it once manually to grant the network permission.

**Daily use:** open/long-press the moey! notification → **Share** → **Adicionar ao Saldo**.
If sharing the notification doesn't expose its text on your iOS version, open moey!, share
the transaction's text, or use the Paste shortcut below.

## Shortcut 2 — "Colar despesa" (manual fallback)

Same as Shortcut 1, but the first action is **Ask for Input** (Text, prompt "Cola a
notificação do moey!") **or** **Get Clipboard** — then steps 4–8 identical, with
`source` = `ios_manual`. Add it to your Home Screen / Back-Tap / Action Button for one tap.

## (Optional) Automation nudge

Shortcuts → **Automation** → **When I get a notification** from **moey!** → **Run
Immediately** → a **Get Contents of URL** POST with `{"raw_text":"","source":"ios_automation"}`.
This can't read the text, so Saldo treats it as a "go check your inbox" ping only. Use it as
a reminder, never as the capture itself.

## Test it (from any terminal)

```bash
curl -i -X POST https://saldo.your-domain.tld/api/ingest \
  -H "Authorization: Bearer <INGEST_WEBHOOK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"raw_text":"Compra de 12,34 EUR em CONTINENTE MATOSINHOS","source":"ios_manual"}'
# -> 201, status "pending_category". Send it again -> 200 "deduped".
# A "Saldo disponível ..." text -> 202 "ignored" (no expense created).
```

## Troubleshooting

- **401** → wrong/missing token. Check the `Authorization: Bearer ...` header.
- **Nothing in the inbox** → the text may have been an ignored type (balance/OTP/declined).
- **Wrong amount/merchant** → the parser is tuned for typical moey! wording; once you
  have a few real samples, share them and the regexes/keywords can be refined.
- **Rotate the token** → change `INGEST_WEBHOOK_TOKEN` in `.env`, `docker compose up -d app`,
  and update the token in both shortcuts.
