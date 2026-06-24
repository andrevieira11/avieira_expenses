#!/usr/bin/env bash
# One-shot release: build + push from THIS machine, then pull + up on the server over SSH.
# The build runs locally; the server only pulls. NEVER builds on the server.
set -euo pipefail

DEPLOY_SSH="${DEPLOY_SSH:-drewst@torpasweb}"     # override: DEPLOY_SSH=user@host
DEPLOY_DIR="${DEPLOY_DIR:-/software/Contas}"      # dir with the server's docker-compose.yml

DIR="$(cd "$(dirname "$0")" && pwd)"
bash "${DIR}/deploy.sh"

echo ">> Deploying on ${DEPLOY_SSH}:${DEPLOY_DIR}"
ssh "${DEPLOY_SSH}" "cd '${DEPLOY_DIR}' && docker compose pull && docker compose up -d"
echo ">> Released."
