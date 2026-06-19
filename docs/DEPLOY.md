# Saldo — Deploy to Proxmox (auto-updating)

Same pattern as your Torpasweb: GitHub Actions builds a Docker image and pushes it to
**GHCR**; your Proxmox host runs it via `docker compose`; **Watchtower** auto-pulls every
new push and recreates the container. The app **self-migrates** on start, so updates need
zero manual steps.

```
git push  →  GitHub Actions builds ghcr.io/andrevieira11/saldo:latest
          →  Watchtower (on Proxmox) pulls + recreates the app
          →  app runs migrations on start  →  live
```

## One-time — GitHub

1. Push this repo to `github.com/andrevieira11/saldo` (or your own; adjust the image name
   in `docker-compose.yml` + the workflow if different).
2. **Settings → Secrets and variables → Actions → Variables → New variable:**
   `NEXT_PUBLIC_APP_URL` = `https://saldo.your-domain.tld`
   (baked into the client bundle at build time — that's why it's a build-time variable).
3. Push to `main`. The **Build and publish image** workflow builds and pushes
   `ghcr.io/andrevieira11/saldo:latest`. Watch it under the repo's **Actions** tab.
4. **Make the package pullable.** Simplest: your profile → **Packages → saldo → Package
   settings → Change visibility → Public** (like your Torpasweb image). To keep it private
   instead, do `docker login ghcr.io` on the Proxmox host (step 3 below) so Watchtower can pull.

## One-time — Proxmox host

```bash
# 1. Stage the stack (you only need these files on the host)
sudo mkdir -p /opt/saldo/ops/backups && sudo chown -R "$USER" /opt/saldo
cd /opt/saldo
# copy docker-compose.yml, .env.example, Caddyfile, ops/backup.sh here (scp or git clone)

# 2. Secrets
cp .env.example .env
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)"
echo "INGEST_WEBHOOK_TOKEN=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
nano .env   # paste those; set POSTGRES_* , DATABASE_URL (same password),
            # BETTER_AUTH_URL + NEXT_PUBLIC_APP_URL = https://saldo.your-domain.tld
chmod 600 .env

# 3. (Private package only) authenticate to GHCR
#    PAT with read:packages scope. Skip if you made the package public.
docker login ghcr.io -u andrevieira11

# 4. Start it (pulls the image, starts Postgres, app self-migrates, starts Watchtower)
docker compose up -d
docker compose ps           # app should reach "healthy" after ~40s
curl -fsS http://127.0.0.1:3000/api/health   # {"ok":true,...}
```

### Caddy + DNS

Add the [`Caddyfile`](../Caddyfile) site block to your existing Caddy (set the hostname +
upstream `host:3000`), reload Caddy, and point DNS `saldo.your-domain.tld` → Caddy's public
IP. Caddy auto-issues TLS. Then:

```bash
curl -fsS https://saldo.your-domain.tld/api/health
```

Sign up at `https://saldo.your-domain.tld/signup` — your book + categories are created
automatically.

## Updates — automatic

Edit code → `git push`. Actions builds the new image; within ~5 min Watchtower pulls it,
recreates the app, and the app runs any new migrations on start. **Nothing to do on the server.**

Force an update immediately:

```bash
cd /opt/saldo && docker compose pull app && docker compose up -d app
```

## Local development

```bash
docker compose -f docker-compose.dev.yml up -d   # local Postgres on :5432
npm run db:migrate
npm run dev                                       # http://localhost:3000
```

Local production-image test (no GHCR): `docker build -t ghcr.io/andrevieira11/saldo:latest .`
then `docker compose up -d`.

## Backups

```bash
chmod +x ops/backup.sh
( crontab -l 2>/dev/null; echo "17 3 * * * /opt/saldo/ops/backup.sh >> /var/log/saldo-backup.log 2>&1" ) | crontab -
```

Daily `pg_dump` to `ops/backups/`, 14-day retention. **Copy them off-host** (rsync/NAS/Proxmox
snapshot) — on-host dumps die with the host.

## moey! capture

Set up the iPhone Shortcut that posts to `POST /api/ingest` — see [`docs/MOEY-IOS.md`](./MOEY-IOS.md).
