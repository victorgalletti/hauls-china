# Copia o banco (./dev.db) e as fotos (./public/uploads) do HOST para os
# volumes do Docker. Use depois de mexer nos dados rodando `pnpm dev` e quiser
# levar para o container. Mantém os volumes nomeados (confiáveis p/ SQLite).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$project = "hauls" # nome do projeto compose = nome da pasta
$dbVol = "${project}_hauls-db"
$upVol = "${project}_hauls-uploads"

if (-not (Test-Path "$root\dev.db")) { Write-Error "Não achei $root\dev.db (rode `pnpm dev` primeiro)"; exit 1 }

Write-Host "Parando o container (se estiver no ar)..."
docker compose stop | Out-Null

Write-Host "Copiando banco host -> volume $dbVol ..."
docker run --rm -v "${dbVol}:/data" -v "${root}:/host" alpine sh -c "cp /host/dev.db /data/dev.db && touch /data/.seeded"

if (Test-Path "$root\public\uploads") {
  Write-Host "Copiando fotos host -> volume $upVol ..."
  docker run --rm -v "${upVol}:/up" -v "${root}\public\uploads:/src" alpine sh -c "cp -r /src/. /up/ 2>/dev/null || true"
}

Write-Host "OK. Suba com:  pnpm docker:up   (ou docker compose up -d)" -ForegroundColor Green
