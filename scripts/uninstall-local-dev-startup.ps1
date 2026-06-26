$ErrorActionPreference = "Stop"

$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Nexus Local Dev Startup.lnk"

if (Test-Path $ShortcutPath) {
  Remove-Item -LiteralPath $ShortcutPath -Force
  Write-Host "[nexus-dev] Startup eliminado: $ShortcutPath"
} else {
  Write-Host "[nexus-dev] No habia acceso directo de startup instalado."
}
