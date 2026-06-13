# Frees ports used by What's Next dev servers (3000 web, 3001 API).
# Usage: npm run dev:stop

param([switch]$Quiet)

function Stop-PortListener {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -eq 'node') {
            if (-not $Quiet) {
                Write-Host "Stopping node (PID $($proc.Id)) on port $Port..." -ForegroundColor Yellow
            }
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

Stop-PortListener -Port 3000
Stop-PortListener -Port 3001

if (-not $Quiet) {
    Write-Host "Ports 3000 and 3001 cleared (node processes only)." -ForegroundColor Green
}
