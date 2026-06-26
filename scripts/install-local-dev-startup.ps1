$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Nexus Local Dev Startup.lnk"
$ScriptPath = Join-Path $Root "scripts\start-local-dev.ps1"

if (-not (Test-Path $ScriptPath)) {
  throw "No se encontro $ScriptPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
$shortcut.WorkingDirectory = $Root
$shortcut.Description = "Starts Docker and Nexus local development services at Windows logon."
$shortcut.Save()

Write-Host "[nexus-dev] Startup instalado: $ShortcutPath"
