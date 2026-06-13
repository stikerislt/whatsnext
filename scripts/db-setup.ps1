# Requires Docker Desktop to be running (Linux engine).
# Usage: npm run db:setup

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-DockerEngine {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    & docker info 2>&1 | Out-Null
    $ok = $LASTEXITCODE -eq 0
    $ErrorActionPreference = $prev
    return $ok
}

Write-Host "Checking Docker..." -ForegroundColor Cyan
if (-not (Test-DockerEngine)) {
    Write-Host ""
    Write-Host "Docker is not running." -ForegroundColor Red
    Write-Host "1. Start Docker Desktop and wait until it says 'Engine running'"
    Write-Host "2. Re-run: npm run db:setup"
    Write-Host ""
    exit 1
}

Write-Host "Starting PostgreSQL + Redis..." -ForegroundColor Cyan
$prev = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& docker compose up -d 2>&1 | Out-Null
$ErrorActionPreference = $prev
if ($LASTEXITCODE -ne 0) {
    & docker compose up -d
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "Waiting for PostgreSQL..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
    $ErrorActionPreference = "SilentlyContinue"
    & docker compose exec -T postgres pg_isready -U whatsnext -d whatsnext 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host "PostgreSQL did not become ready in time." -ForegroundColor Red
    exit 1
}

Write-Host "Running Prisma migrate..." -ForegroundColor Cyan
Set-Location "$Root\packages\database"
$migrationsDir = Join-Path $Root "packages\database\prisma\migrations"
if (Test-Path $migrationsDir) {
    npx prisma migrate deploy
} else {
    npx prisma migrate dev --name init
}
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Seeding demo data..." -ForegroundColor Cyan
npm run seed
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Database ready. Demo login: elena@technova.lt / demo12345" -ForegroundColor Green
Write-Host "Start app: npm run dev" -ForegroundColor Green
