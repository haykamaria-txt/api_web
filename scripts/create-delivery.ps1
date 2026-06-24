[CmdletBinding()]
param(
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $OutputPath) {
  $OutputPath = Join-Path $projectRoot "entrega-etapa-2.zip"
}

$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$systemTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$stagingRoot = [System.IO.Path]::GetFullPath(
  (Join-Path $systemTempRoot "api-web-entrega-$([guid]::NewGuid())")
)
$packageRoot = Join-Path $stagingRoot "api_web"

if (
  -not $stagingRoot.StartsWith($systemTempRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
  -not (Split-Path -Leaf $stagingRoot).StartsWith("api-web-entrega-")
) {
  throw "Diretório temporário inválido: $stagingRoot"
}

$excludedDirectories = @(
  ".git",
  ".agents",
  ".codex",
  ".docker",
  ".idea",
  ".npm",
  ".vite",
  ".vscode",
  "build",
  "coverage",
  "dist",
  "docker-data",
  "logs",
  "node_modules",
  "pgdata",
  "postgres-data"
)

$excludedFileNames = @(
  ".env",
  ".eslintcache",
  "Thumbs.db",
  "desktop.ini",
  ".DS_Store"
)

$excludedExtensions = @(".bak", ".log", ".swp", ".temp", ".tmp", ".zip")

try {
  New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

  Get-ChildItem -LiteralPath $projectRoot -Force -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($projectRoot.Length).TrimStart([char[]]"\/")
    $segments = $relativePath -split "[\\/]"
    $containsExcludedDirectory = $segments |
      Where-Object { $excludedDirectories -contains $_ } |
      Select-Object -First 1

    if ($containsExcludedDirectory) {
      return
    }

    if (-not $_.PSIsContainer) {
      if ($excludedFileNames -contains $_.Name) {
        return
      }

      if ($_.Name -like ".env.*" -and $_.Name -ne ".env.example") {
        return
      }

      if ($excludedExtensions -contains $_.Extension.ToLowerInvariant()) {
        return
      }
    }

    $destination = Join-Path $packageRoot $relativePath
    if ($_.PSIsContainer) {
      New-Item -ItemType Directory -Path $destination -Force | Out-Null
      return
    }

    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
  }

  if (Test-Path -LiteralPath $outputFullPath) {
    Remove-Item -LiteralPath $outputFullPath -Force
  }

  Compress-Archive -LiteralPath $packageRoot -DestinationPath $outputFullPath -CompressionLevel Optimal
  Write-Output "ZIP criado em: $outputFullPath"
}
finally {
  if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  }
}
