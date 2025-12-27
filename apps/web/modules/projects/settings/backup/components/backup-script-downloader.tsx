"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/modules/ui/components/button";

const BACKUP_SCRIPT = `$ErrorActionPreference = "Stop"
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
    docker cp "$containerName\`:/tmp/$backupFile" "$backupDir\$backupFile"
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
`;

export const BackupScriptDownloader = () => {
  const handleDownload = () => {
    const blob = new Blob([BACKUP_SCRIPT], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-db.ps1";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleRestoreDownload = () => {
    const restoreScript = `$ErrorActionPreference = "Stop"
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

if ($selection -match "^\\d+$" -and [int]$selection -lt $backups.Count) {
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
        docker cp $selectedFile.FullName "$containerName\`:/tmp/restore.sql"

        # Run psql to restore
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

Read-Host "Press Enter to exit..."`;

    const blob = new Blob([restoreScript], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "restore-db.ps1";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">1. Backup Script</h3>
        <p className="text-sm text-slate-600">
          Download this PowerShell script and run it on your server to create a full database backup.
        </p>
        <div className="rounded-md bg-slate-950 p-4">
          <pre className="overflow-x-auto text-xs text-slate-50">
            <code>{BACKUP_SCRIPT}</code>
          </pre>
        </div>
        <Button onClick={handleDownload} variant="secondary">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download backup-db.ps1
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">2. Restore Script</h3>
        <p className="text-sm text-slate-600">
          Use this script to restore a previous backup.{" "}
          <strong>Warning: This will overwrite your current database.</strong>
        </p>
        <Button onClick={handleRestoreDownload} variant="outline">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download restore-db.ps1
        </Button>
      </div>
    </div>
  );
};
