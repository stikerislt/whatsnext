# Stops web dev, clears Next.js/webpack cache. Run before dev if you see ENOENT .pack.gz errors.
$ErrorActionPreference = "SilentlyContinue"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Stopping dev servers on ports 3000 and 3001..." -ForegroundColor Cyan
& "$Root\scripts\free-ports.ps1" -Quiet

$paths = @(
    "$Root\apps\web\.next",
    "$Root\node_modules\.cache"
)

foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Host "Removing $p" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $p
    }
}

Write-Host "Cache cleared. Start with: npm run dev" -ForegroundColor Green
