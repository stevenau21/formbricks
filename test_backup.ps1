$ErrorActionPreference = "Stop"
$backupDir = Join-Path $PSScriptRoot "backups"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "formbricks_backup_$timestamp"
$tempBackupDir = Join-Path $backupDir $backupName
$zipFile = "$tempBackupDir.zip"

$postgresContainer = "formbricks-postgres-1"
$minioContainer = "formbricks-minio-1"
$dbUser = "postgres"
$dbName = "formbricks"

# Create backup directory
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
New-Item -ItemType Directory -Path $tempBackupDir | Out-Null

Write-Host "Starting full backup (DB + Files)..." -ForegroundColor Cyan

try {
    # Check containers
    foreach ($c in @($postgresContainer, $minioContainer)) {
        $status = docker inspect -f '{{.State.Running}}' $c 2>$null
        if ($status -ne 'true') { throw "Container '$c' is not running." }
    }

    # 1. Database Dump
    Write-Host "   Backing up Database..." -NoNewline
    docker exec $postgresContainer pg_dump -U $dbUser -d $dbName -f "/tmp/dump.sql"
    docker cp "$postgresContainer`:/tmp/dump.sql" "$tempBackupDir\database.sql"
    docker exec $postgresContainer rm "/tmp/dump.sql"
    Write-Host " Done." -ForegroundColor Green

    # 2. MinIO Files
    Write-Host "   Backing up File Uploads..." -NoNewline
    docker cp "$minioContainer`:/data" "$tempBackupDir\minio-data"
    Write-Host " Done." -ForegroundColor Green

    # 3. Zip it up
    Write-Host "   Compressing archive..." -NoNewline
    Compress-Archive -Path "$tempBackupDir\*" -DestinationPath $zipFile
    Write-Host " Done." -ForegroundColor Green

    # Cleanup temp folder
    Remove-Item -Path $tempBackupDir -Recurse -Force

    Write-Host ""
    Write-Host "Backup successful!" -ForegroundColor Green
    Write-Host "File: $zipFile" -ForegroundColor White
}
catch {
    Write-Error "❌ Backup failed: $_"
    if (Test-Path $tempBackupDir) { Remove-Item -Path $tempBackupDir -Recurse -Force }
    Read-Host "Press Enter to exit..."
}

# Optional: Pause to let user see the result if double-clicked
if ($Host.Name -eq "ConsoleHost") {
    Start-Sleep -Seconds 3
}
