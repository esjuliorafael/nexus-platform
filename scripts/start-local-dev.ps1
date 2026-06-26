$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $Root ".local-dev"
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
$StartupLog = Join-Path $RuntimeDir "startup-latest.log"

Start-Transcript -Path $StartupLog -Force | Out-Null

try {

function Write-Step {
  param([string]$Message)
  Write-Host "[nexus-dev] $Message"
}

function Test-Port {
  param([int]$Port)
  $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  return $null -ne $connection
}

function Wait-Port {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Port -Port $Port) { return $true }
    Start-Sleep -Seconds 1
  }

  return $false
}

function Start-DockerDesktop {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Step "Docker ya esta listo."
    return
  }

  $dockerDesktop = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1

  if (-not $dockerDesktop) {
    throw "No se encontro Docker Desktop en las rutas habituales."
  }

  Write-Step "Iniciando Docker Desktop..."
  Start-Process -FilePath $dockerDesktop -WindowStyle Hidden

  for ($i = 0; $i -lt 90; $i++) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Step "Docker daemon listo."
      return
    }
    Start-Sleep -Seconds 2
  }

  throw "Docker no respondio despues de 180 segundos."
}

function Start-App {
  param(
    [string]$Name,
    [int]$Port,
    [string]$Command
  )

  if (Test-Port -Port $Port) {
    Write-Step "$Name ya esta escuchando en puerto $Port."
    return
  }

  $stdout = Join-Path $Root ".$Name-dev.out.log"
  $stderr = Join-Path $Root ".$Name-dev.err.log"
  $pidFile = Join-Path $RuntimeDir "$Name.pid"

  Write-Step "Iniciando $Name en puerto $Port..."
  $process = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-Command",
      "Set-Location '$Root'; $Command"
    ) `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden `
    -PassThru

  Set-Content -Path $pidFile -Value $process.Id

  if (Wait-Port -Port $Port -TimeoutSeconds 45) {
    Write-Step "$Name listo en puerto $Port."
    return
  }

  Write-Step "$Name no confirmo puerto $Port. Revisa $stdout y $stderr."
}

Set-Location $Root

Start-DockerDesktop

Write-Step "Levantando infraestructura Docker..."
docker compose up -d

Start-App -Name "api" -Port 3001 -Command "corepack pnpm --dir apps/api dev"
Start-App -Name "admin" -Port 4000 -Command "corepack pnpm --dir apps/admin exec vite --host 0.0.0.0 --port 4000"
Start-App -Name "storefront" -Port 3000 -Command "corepack pnpm --dir apps/storefront dev"

Write-Step "Entorno local listo."
Write-Host "Admin:      http://localhost:4000"
Write-Host "Storefront: http://localhost:3000"
Write-Host "API:        http://localhost:3001/api/v1/health"
}
finally {
  Stop-Transcript | Out-Null
}
