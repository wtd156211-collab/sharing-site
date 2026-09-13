param(
  [string]$OutputDir = "./backups/db",
  [string]$ComposeProject = "family-notes"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutputDir "family-notes-$stamp.sql"
docker compose -p $ComposeProject exec -T db sh -c 'exec mysqldump --single-transaction --routines --events -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | Out-File -FilePath $target -Encoding utf8
if ((Get-Item $target).Length -eq 0) { throw "Database backup is empty" }
Write-Output "Created $target"
