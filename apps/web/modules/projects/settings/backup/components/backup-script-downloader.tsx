"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/modules/ui/components/button";

const BACKUP_SCRIPT = `$ErrorActionPreference = "Stop"
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

Write-Host "⏳ Starting full backup (DB + Files)..." -ForegroundColor Cyan

try {
    # Check containers
    foreach ($c in @($postgresContainer, $minioContainer)) {
        $status = docker inspect -f '{{.State.Running}}' $c 2>$null
        if ($status -ne 'true') { throw "Container '$c' is not running." }
    }

    # 1. Database Dump
    Write-Host "   Backing up Database..." -NoNewline
    docker exec $postgresContainer pg_dump -U $dbUser -d $dbName -f "/tmp/dump.sql"
    docker cp "$postgresContainer\`:/tmp/dump.sql" "$tempBackupDir\\database.sql"
    docker exec $postgresContainer rm "/tmp/dump.sql"
    Write-Host " Done." -ForegroundColor Green

    # 2. MinIO Files
    Write-Host "   Backing up File Uploads..." -NoNewline
    docker cp "$minioContainer\`:/data" "$tempBackupDir\\minio-data"
    Write-Host " Done." -ForegroundColor Green

    # 3. Zip it up
    Write-Host "   Compressing archive..." -NoNewline
    Compress-Archive -Path "$tempBackupDir\\*" -DestinationPath $zipFile
    Write-Host " Done." -ForegroundColor Green

    # Cleanup temp folder
    Remove-Item -Path $tempBackupDir -Recurse -Force

    Write-Host ""
    Write-Host "✅ Backup successful!" -ForegroundColor Green
    Write-Host "📂 File: $zipFile" -ForegroundColor White
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
$postgresContainer = "formbricks-postgres-1"
$minioContainer = "formbricks-minio-1"
$dbUser = "postgres"
$dbName = "formbricks"

Write-Host "⚠️  WARNING: This will OVERWRITE the current database AND file uploads." -ForegroundColor Yellow
Write-Host "Make sure you have a backup of the current state." -ForegroundColor Yellow
Write-Host ""

# List zip backups
$backups = Get-ChildItem -Path $backupDir -Filter "*.zip" | Sort-Object LastWriteTime -Descending

if ($backups.Count -eq 0) {
    Write-Error "No .zip backup files found in $backupDir"
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
        Write-Host "⏳ Restoring..." -ForegroundColor Cyan
        
        $tempDir = Join-Path $backupDir "restore_temp"
        if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
        New-Item -ItemType Directory -Path $tempDir | Out-Null

        # 1. Extract
        Write-Host "   Extracting archive..." -NoNewline
        Expand-Archive -Path $selectedFile.FullName -DestinationPath $tempDir -Force
        Write-Host " Done." -ForegroundColor Green

        # 2. Restore DB
        if (Test-Path "$tempDir\\database.sql") {
            Write-Host "   Restoring Database..." -NoNewline
            docker cp "$tempDir\\database.sql" "$postgresContainer\`:/tmp/restore.sql"
            docker exec $postgresContainer psql -U $dbUser -d $dbName -f "/tmp/restore.sql"
            docker exec $postgresContainer rm "/tmp/restore.sql"
            Write-Host " Done." -ForegroundColor Green
        }

        # 3. Restore MinIO
        if (Test-Path "$tempDir\\minio-data") {
            Write-Host "   Restoring Files..." -NoNewline
            $buckets = Get-ChildItem -Path "$tempDir\\minio-data" -Directory
            foreach ($bucket in $buckets) {
                 docker cp "$($bucket.FullName)" "$minioContainer\`:/data/"
            }
            if (Test-Path "$tempDir\\minio-data\\.minio.sys") {
                docker cp "$tempDir\\minio-data\\.minio.sys" "$minioContainer\`:/data/"
            }
            Write-Host " Done." -ForegroundColor Green
        }

        # Cleanup
        Remove-Item -Path $tempDir -Recurse -Force

        Write-Host "✅ Restore completed!" -ForegroundColor Green
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
