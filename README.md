This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

Images are built on the **PC** (or CI) and pushed to GHCR; the **server only pulls**.
The server (Proxmox VM 100) must never build — heavy builds freeze the whole VM.

**One-time GHCR login (PC):**

```bash
echo <PAT> | docker login ghcr.io -u andrevieira11 --password-stdin   # PAT scope: write:packages
```

Make the `saldo` package **public** (GitHub → package → settings → visibility) so the server
pulls without logging in. No token is stored in the repo.

**PC — build + push** (tags `:latest` and the git short-SHA):

```bash
./deploy.sh            # macOS / Linux / Git-Bash / WSL
pwsh ./deploy.ps1      # Windows PowerShell
```

Override the baked origin or image if needed: `NEXT_PUBLIC_APP_URL=… IMAGE=… ./deploy.sh`.

**Server — pull + run** (never builds):

```bash
docker compose pull && docker compose up -d
```

**One-shot** — PC build+push, then remote pull over SSH (build still runs locally):

```bash
DEPLOY_SSH=user@host DEPLOY_DIR=/path/to/compose ./release.sh   # or: pwsh ./release.ps1
```

Watchtower on the server also auto-pulls `:latest` within ~5 min, so the explicit
`pull && up -d` is just for an immediate deploy.
