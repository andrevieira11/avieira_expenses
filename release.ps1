# One-shot release: build + push from THIS PC, then pull + up on the server over SSH.
# The build runs locally; the server only pulls. NEVER builds on the server.
$ErrorActionPreference = "Stop"

$Ssh = if ($env:DEPLOY_SSH) { $env:DEPLOY_SSH } else { "drewst@torpasweb" }
$Dir = if ($env:DEPLOY_DIR) { $env:DEPLOY_DIR } else { "/software/Contas" }

& "$PSScriptRoot\deploy.ps1"
if ($LASTEXITCODE -ne 0) { throw "deploy failed" }

Write-Host ">> Deploying on ${Ssh}:${Dir}"
ssh $Ssh "cd '$Dir' && docker compose pull && docker compose up -d"
if ($LASTEXITCODE -ne 0) { throw "remote deploy failed" }
Write-Host ">> Released."
