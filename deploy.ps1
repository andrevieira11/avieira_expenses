# Build the Saldo image on THIS PC and push to GHCR.
# NEVER run this on the server / Proxmox VM 100 — builds freeze the whole VM.
# The server only ever does:  docker compose pull && docker compose up -d
$ErrorActionPreference = "Stop"

$Image  = if ($env:IMAGE) { $env:IMAGE } else { "ghcr.io/andrevieira11/saldo" }
# Baked into the client bundle at build time — must be the real public origin.
$AppUrl = if ($env:NEXT_PUBLIC_APP_URL) { $env:NEXT_PUBLIC_APP_URL } else { "https://saldo.torpasweb.com" }
$Sha    = (git rev-parse --short HEAD).Trim()

Write-Host ">> Building ${Image}:latest and ${Image}:$Sha"
Write-Host ">> NEXT_PUBLIC_APP_URL=$AppUrl"
docker build --build-arg "NEXT_PUBLIC_APP_URL=$AppUrl" -t "${Image}:latest" -t "${Image}:$Sha" .
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }

Write-Host ">> Pushing ${Image}:latest"
docker push "${Image}:latest"
if ($LASTEXITCODE -ne 0) { throw "docker push :latest failed" }
Write-Host ">> Pushing ${Image}:$Sha"
docker push "${Image}:$Sha"
if ($LASTEXITCODE -ne 0) { throw "docker push :$Sha failed" }

Write-Host ">> Done. Pushed ${Image}:latest and ${Image}:$Sha"
Write-Host ">> On the server:  docker compose pull && docker compose up -d"
