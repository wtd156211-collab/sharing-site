param(
  [Parameter(Mandatory = $true)][string]$DatabaseDump,
  [Parameter(Mandatory = $true)][string]$UploadsArchive,
  [string]$ScratchDir = "./tmp/restore-drill"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $DatabaseDump)) { throw "Database dump not found" }
if (-not (Test-Path -LiteralPath $UploadsArchive)) { throw "Uploads archive not found" }
if ((Get-Item $DatabaseDump).Length -eq 0) { throw "Database dump is empty" }
if ((Get-Item $UploadsArchive).Length -eq 0) { throw "Uploads archive is empty" }
New-Item -ItemType Directory -Force -Path $ScratchDir | Out-Null
$extractDir = Join-Path $ScratchDir "uploads"
Expand-Archive -LiteralPath $UploadsArchive -DestinationPath $extractDir -Force
$fileCount = @(Get-ChildItem -LiteralPath $extractDir -Recurse -File).Count
Write-Output "Restore drill validated dump and extracted $fileCount upload files into $extractDir"
