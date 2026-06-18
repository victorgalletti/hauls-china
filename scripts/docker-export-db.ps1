# Copia o banco e as fotos dos volumes do Docker DE VOLTA para o host
# (./dev.db e ./public/uploads). Use quando criou dados rodando no Docker e
# quer continuar com eles no `pnpm dev`. ATENÇÃO: sobrescreve o ./dev.db local.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$project = "hauls"
$dbVol = "${project}_hauls-db"
$upVol = "${project}_hauls-uploads"

Write-Host "Parando o container (se estiver no ar)..."
docker compose stop | Out-Null

Write-Host "Copiando banco volume $dbVol -> host ./dev.db ..."
docker run --rm -v "${dbVol}:/data" -v "${root}:/host" alpine sh -c "cp /data/dev.db /host/dev.db"

New-Item -ItemType Directory -Force "$root\public\uploads" | Out-Null
Write-Host "Copiando fotos volume $upVol -> host ./public/uploads ..."
docker run --rm -v "${upVol}:/up" -v "${root}\public\uploads:/dst" alpine sh -c "cp -r /up/. /dst/ 2>/dev/null || true"

Write-Host "OK. Agora `pnpm dev` usa os dados que estavam no Docker." -ForegroundColor Green
