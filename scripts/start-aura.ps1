# Start Aura Work desktop (sidecars auto-start from the Tauri app)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Stop-Port($port) {
  $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

Get-Process -Name "aura-desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
foreach ($port in 47821, 47822, 47823, 47824, 47825, 47826, 47828) {
  Stop-Port $port
}

$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path

Write-Host "Building sidecars..."
npm run build:sidecars
npm run stage:bundle

Write-Host "Launching Aura Work (sidecars start automatically)..."
npm run dev
