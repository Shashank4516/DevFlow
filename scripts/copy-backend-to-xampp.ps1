# Sync DevFlow PHP backend into XAMPP htdocs (see Admin/docs/XAMPP-DASHBOARD.md).
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File .\scripts\copy-backend-to-xampp.ps1
#
# Default destination matches the guide:
#   C:\xampp\htdocs\devflow-backend\backend\

param(
    [string] $DestRoot = "C:\xampp\htdocs\devflow-backend\backend"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Src = Join-Path $RepoRoot "backend"

if (-not (Test-Path $Src)) {
    Write-Host "Missing backend folder: $Src" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path (Split-Path $DestRoot -Parent) | Out-Null

# /MIR = mirror (add/update/delete so htdocs matches repo)
robocopy $Src $DestRoot /MIR /XD .git /NFL /NDL /NJH /NJS /NP
$code = $LASTEXITCODE
# Robocopy: 0–7 often mean success with different copy stats; 8+ = failure
if ($code -ge 8) {
    Write-Host "robocopy failed with exit code $code" -ForegroundColor Red
    exit $code
}

Write-Host "Synced backend -> $DestRoot" -ForegroundColor Green
