$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $Root ".local-dev"

function Write-Step {
  param([string]$Message)
  Write-Host "[nexus-dev] $Message"
}

function Stop-ProcessTree {
  param([int]$ProcessId)

  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
  foreach ($child in $children) {
    Stop-ProcessTree -ProcessId $child.ProcessId
  }

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
  }
}

if (Test-Path $RuntimeDir) {
  Get-ChildItem -Path $RuntimeDir -Filter "*.pid" -ErrorAction SilentlyContinue | ForEach-Object {
    $name = $_.BaseName
    $pidText = Get-Content -Path $_.FullName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pidText -match "^\d+$") {
      Write-Step "Deteniendo $name..."
      Stop-ProcessTree -ProcessId ([int]$pidText)
    }
    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  }
}

Write-Step "Liberando procesos Node conocidos por puerto..."
$ports = @(3000, 3001, 4000)
foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    Stop-ProcessTree -ProcessId $connection.OwningProcess
  }
}

Write-Step "Deteniendo infraestructura Docker..."
Set-Location $Root
docker compose stop

Write-Step "Entorno local detenido."
