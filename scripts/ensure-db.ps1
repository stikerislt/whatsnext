# Ensures Postgres is up before migrate/seed. Usage: called from npm scripts.
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

if (-not (Test-DockerEngine)) {
    Write-Host ""
    Write-Host "Database is not reachable because Docker is not running." -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Start Docker Desktop (wait for 'Engine running')"
    Write-Host "2. Run:  npm run db:setup"
    Write-Host "   Or:    docker compose up -d"
    Write-Host "3. Then: npm run db:seed"
    Write-Host ""
    exit 1
}

$running = & docker compose ps --status running --services 2>$null
if ($running -notcontains "postgres") {
    Write-Host "Starting PostgreSQL + Redis..." -ForegroundColor Cyan
    & docker compose up -d 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        & docker compose up -d
        exit $LASTEXITCODE
    }
}

Write-Host "Waiting for PostgreSQL on localhost:5433..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    $ErrorActionPreference = "SilentlyContinue"
    & docker compose exec -T postgres pg_isready -U whatsnext -d whatsnext 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "PostgreSQL did not become ready. Check: docker compose logs postgres" -ForegroundColor Red
    exit 1
}
