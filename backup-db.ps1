$ErrorActionPreference = "Stop"
$backupDir = Join-Path $PSScriptRoot "backups"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = "formbricks_backup_$timestamp.sql"
$containerName = "formbricks-postgres-1"
$dbUser = "postgres"
$dbName = "formbricks"

# Create backup directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created backup directory at $backupDir" -ForegroundColor Gray
}

Write-Host "⏳ Starting backup of Formbricks database..." -ForegroundColor Cyan

try {
    # Check if container is running
    $containerStatus = docker inspect -f '{{.State.Running}}' $containerName 2>$null
    if ($containerStatus -ne 'true') {
        throw "Container '$containerName' is not running. Please start Docker first."
    }

    # 1. Generate dump inside the container (avoids PowerShell encoding issues)
    Write-Host "   Generating dump file..." -NoNewline
    docker exec $containerName pg_dump -U $dbUser -d $dbName -f "/tmp/$backupFile"
    Write-Host " Done." -ForegroundColor Green

    # 2. Copy file from container to host
    Write-Host "   Copying to host..." -NoNewline
    docker cp "$containerName`:/tmp/$backupFile" "$backupDir\$backupFile"
    Write-Host " Done." -ForegroundColor Green

    # 3. Clean up temp file in container
    docker exec $containerName rm "/tmp/$backupFile"

    Write-Host ""
    Write-Host "✅ Backup successful!" -ForegroundColor Green
    Write-Host "📂 Location: $backupDir\$backupFile" -ForegroundColor White
}
catch {
    Write-Host ""
    Write-Error "❌ Backup failed: $_"
    Read-Host "Press Enter to exit..."
}

# Optional: Pause to let user see the result if double-clicked
if ($Host.Name -eq "ConsoleHost") {
    Start-Sleep -Seconds 3
}
