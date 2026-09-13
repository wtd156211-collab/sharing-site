param(
  [string]$UploadDir = "./data/uploads",
  [string]$OutputDir = "./backups/uploads"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $UploadDir)) { throw "Upload directory does not exist: $UploadDir" }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutputDir "uploads-$stamp.zip"
Compress-Archive -Path (Join-Path $UploadDir "*") -DestinationPath $target -CompressionLevel Optimal
if ((Get-Item $target).Length -eq 0) { throw "Upload backup is empty" }
Write-Output "Created $target"
