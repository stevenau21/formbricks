$ErrorActionPreference = "Stop"
$backupDir = Join-Path $PSScriptRoot "backups"
$containerName = "formbricks-postgres-1"
$dbUser = "postgres"
$dbName = "formbricks"

Write-Host "⚠️  WARNING: This will OVERWRITE the current database with a backup." -ForegroundColor Yellow
Write-Host "Make sure you have a backup of the current state before proceeding." -ForegroundColor Yellow
Write-Host ""

# List available backups
$backups = Get-ChildItem -Path $backupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending

if ($backups.Count -eq 0) {
    Write-Error "No backup files found in $backupDir"
    exit
}

Write-Host "Available Backups:" -ForegroundColor Cyan
for ($i = 0; $i -lt $backups.Count; $i++) {
    Write-Host "[$i] $($backups[$i].Name)  ($($backups[$i].LastWriteTime))"
}
Write-Host ""

$selection = Read-Host "Enter the number of the backup to restore (0-$($backups.Count - 1))"

if ($selection -match "^\d+$" -and [int]$selection -lt $backups.Count) {
    $selectedFile = $backups[[int]$selection]
    Write-Host "You selected: $($selectedFile.Name)" -ForegroundColor Cyan
    
    $confirm = Read-Host "Are you sure you want to restore this backup? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "Restore cancelled." -ForegroundColor Gray
        exit
    }

    try {
        Write-Host "⏳ Restoring database..." -ForegroundColor Cyan
        
        # Copy backup to container
        docker cp $selectedFile.FullName "$containerName`:/tmp/restore.sql"

        # Drop and recreate schema to ensure clean state (optional but recommended for full restore)
        # Note: This might fail if there are active connections, so we might need to force it or just run psql
        
        # Run psql to restore
        # We use -c to run the SQL file
        docker exec $containerName psql -U $dbUser -d $dbName -f "/tmp/restore.sql"

        # Cleanup
        docker exec $containerName rm "/tmp/restore.sql"

        Write-Host "✅ Restore completed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Error "❌ Restore failed: $_"
    }
}
else {
    Write-Error "Invalid selection."
}

Read-Host "Press Enter to exit..."
