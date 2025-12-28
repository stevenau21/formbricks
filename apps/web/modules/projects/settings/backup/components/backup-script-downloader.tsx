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

function Get-DownloadsDirectory {
  try {
    $shell = New-Object -ComObject Shell.Application
    $downloads = $shell.NameSpace("shell:Downloads").Self.Path
    if ($downloads -and (Test-Path $downloads)) {
      return $downloads
    }
  } catch {
    # ignore and fall back
  }

  return (Join-Path $env:USERPROFILE "Downloads")
}

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

    $downloadsDir = Get-DownloadsDirectory
    if (Test-Path $downloadsDir) {
      $copyTarget = Join-Path $downloadsDir (Split-Path -Leaf $zipFile)
      Copy-Item -LiteralPath $zipFile -Destination $copyTarget -Force
      Write-Host "📥 Copied to Downloads: $copyTarget" -ForegroundColor White
    }
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
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-db.ps1";
    document.body.appendChild(a);
    a.click();
    globalThis.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleRestoreDownload = () => {
    const restoreScript = `$ErrorActionPreference = "Stop"
$backupDir = Join-Path $PSScriptRoot "backups"
$postgresContainer = "formbricks-postgres-1"
$minioContainer = "formbricks-minio-1"
$dbUser = "postgres"
$dbName = "formbricks"

  function Get-DownloadsDirectory {
    try {
      $shell = New-Object -ComObject Shell.Application
      $downloads = $shell.NameSpace("shell:Downloads").Self.Path
      if ($downloads -and (Test-Path $downloads)) {
        return $downloads
      }
    } catch {
      # ignore and fall back
    }

    return (Join-Path $env:USERPROFILE "Downloads")
  }

  function Get-ZipManifest {
    param(
      [Parameter(Mandatory = $true)][string]$ZipPath
    )

    try {
      Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue | Out-Null
      $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
      try {
        $entries = @($zip.Entries | ForEach-Object { $_.FullName })
        $hasDatabaseSql = $false
        $hasMinioData = $false

        foreach ($e in $entries) {
          if ($e -eq "database.sql") { $hasDatabaseSql = $true }
          if ($e -match "^minio-data[/\\\\]") { $hasMinioData = $true }
          if ($hasDatabaseSql -and $hasMinioData) { break }
        }

        return [PSCustomObject]@{
          HasDatabaseSql = $hasDatabaseSql
          HasMinioData   = $hasMinioData
          Entries        = $entries
        }
      } finally {
        $zip.Dispose()
      }
    } catch {
      return [PSCustomObject]@{
        HasDatabaseSql = $false
        HasMinioData   = $false
        Entries        = @()
        Error          = $_.Exception.Message
      }
    }
  }

  function Get-SurveyRowCountFromDump {
    param(
      [Parameter(Mandatory = $true)][string]$SqlPath
    )

    if (-not (Test-Path $SqlPath)) { return $null }

    $reader = [System.IO.StreamReader]::new($SqlPath)
    try {
      $inCopy = $false
      $count = 0

      while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()

        if (-not $inCopy) {
          if ($line -like 'COPY public."Survey"*FROM stdin;*') {
            $inCopy = $true
          }
          continue
        }

        if ($line -eq '\\.') { break }
        if ($line) { $count++ }
      }

      if (-not $inCopy) { return $null }
      return $count
    } finally {
      $reader.Dispose()
    }
  }

Write-Host "⚠️  WARNING: This will OVERWRITE the current database AND file uploads." -ForegroundColor Yellow
Write-Host "Make sure you have a backup of the current state." -ForegroundColor Yellow
Write-Host ""
Write-Host "Script Version: 3.1 (Full Restore)" -ForegroundColor Gray

# List zip backups
$downloadsDir = Get-DownloadsDirectory
 $projectBackupsDir = "C:\\dev\\projects\\formbricks\\backups"

Write-Host "Searching for backups in:" -ForegroundColor Gray
Write-Host " - Script folder: $PSScriptRoot" -ForegroundColor Gray
Write-Host " - Downloads (detected): $downloadsDir" -ForegroundColor Gray
Write-Host " - Project Backups: $projectBackupsDir" -ForegroundColor Gray

$backups = @()

# Collect backups from all locations
$searchPaths = @($PSScriptRoot, $backupDir, $downloadsDir, $projectBackupsDir) |
  ForEach-Object {
    try { (Resolve-Path $_ -ErrorAction Stop).Path } catch { $_ }
  } |
  Select-Object -Unique
$foundFiles = @{} # Use hash table for deduplication by FullName

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        $files = Get-ChildItem -Path $path -Filter "*.zip" -ErrorAction SilentlyContinue
        if ($files) {
            Write-Host "   Found $($files.Count) backup(s) in $path" -ForegroundColor DarkGray
            foreach ($file in $files) {
                if (-not $foundFiles.ContainsKey($file.FullName)) {
                $manifest = Get-ZipManifest -ZipPath $file.FullName
                $file | Add-Member -NotePropertyName HasDatabaseSql -NotePropertyValue $manifest.HasDatabaseSql -Force
                $file | Add-Member -NotePropertyName HasMinioData -NotePropertyValue $manifest.HasMinioData -Force
                    $foundFiles[$file.FullName] = $file
                    $backups += $file
                }
            }
        } else {
            Write-Host "   No backups found in $path" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "   Path not found: $path" -ForegroundColor DarkGray
    }
}

# Sort
$backups = $backups | Sort-Object LastWriteTime -Descending

if ($backups.Count -eq 0) {
    Write-Error "No .zip backup files found in any of the search locations."
    exit
}

Write-Host "Available Backups:" -ForegroundColor Cyan
for ($i = 0; $i -lt $backups.Count; $i++) {
  $b = $backups[$i]
  $sizeMb = [Math]::Round(($b.Length / 1MB), 2)
  $dbFlag = if ($b.PSObject.Properties.Match('HasDatabaseSql').Count -gt 0 -and $b.HasDatabaseSql) { "db" } else { "no-db" }
  $minioFlag = if ($b.PSObject.Properties.Match('HasMinioData').Count -gt 0 -and $b.HasMinioData) { "files" } else { "no-files" }
  Write-Host "[$i] $($b.Name)  ($($b.LastWriteTime))  [$dbFlag, $minioFlag, $($sizeMb)MB]"
  Write-Host "    Location: $($b.DirectoryName)" -ForegroundColor DarkGray
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
        
        $tempDir = Join-Path $env:TEMP "formbricks-restore-$((Get-Date).ToString('yyyyMMddHHmmss'))"
        if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
        New-Item -ItemType Directory -Path $tempDir | Out-Null

        # 1. Extract
        Write-Host "   Extracting archive..." -NoNewline
        Expand-Archive -Path $selectedFile.FullName -DestinationPath $tempDir -Force
        Write-Host " Done." -ForegroundColor Green

        # 2. Restore DB
        if (Test-Path "$tempDir\\database.sql") {
          $sqlSizeKb = [Math]::Round(((Get-Item "$tempDir\\database.sql").Length / 1KB), 1)
          $surveyRows = Get-SurveyRowCountFromDump -SqlPath "$tempDir\\database.sql"
            Write-Host "   Backup DB dump size: $($sqlSizeKb)KB" -ForegroundColor DarkGray
          if ($null -ne $surveyRows) {
            Write-Host "   Surveys contained in backup: $surveyRows" -ForegroundColor DarkGray
            if ($surveyRows -le 2) {
              Write-Host "      ⚠️ This backup contains $surveyRows survey(s). If you expected more, you likely selected the wrong backup (or backed up before creating them)." -ForegroundColor Yellow
            }
          }

            Write-Host "   Restoring Database..." -NoNewline
            docker cp "$tempDir\\database.sql" "$postgresContainer\`:/tmp/restore.sql"
            
            # Terminate connections
            docker exec $postgresContainer psql -U $dbUser -d postgres -c "SELECT pid, pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$dbName' AND pid <> pg_backend_pid();" | Out-Null
            
            # Drop and Recreate DB
            docker exec $postgresContainer psql -U $dbUser -d postgres -c "DROP DATABASE IF EXISTS $dbName;"
            docker exec $postgresContainer psql -U $dbUser -d postgres -c "CREATE DATABASE $dbName;"

            # Import
            docker exec $postgresContainer psql -U $dbUser -d $dbName -f "/tmp/restore.sql"
            docker exec $postgresContainer rm "/tmp/restore.sql"
            Write-Host " Done." -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ No database.sql found." -ForegroundColor Yellow
        }

        # 3. Restore MinIO
        if (Test-Path "$tempDir\\minio-data") {
            Write-Host "   Restoring Files..." -NoNewline
            docker cp "$tempDir\\minio-data\\." "$minioContainer\`:/data/"
            Write-Host " Done." -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ No minio-data folder found." -ForegroundColor Yellow
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
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "restore-db.ps1";
    document.body.appendChild(a);
    a.click();
    globalThis.URL.revokeObjectURL(url);
    a.remove();
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
          To restore a backup:
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Download the <strong>restore-db.ps1</strong> script below.
            </li>
            <li>Run the script (Right-click &gt; Run with PowerShell).</li>
            <li>
              It will automatically find backups in your <strong>Downloads</strong> folder or the script
              folder.
            </li>
          </ol>
          <strong>Warning: This will overwrite your current database and files.</strong>
        </p>
        <Button onClick={handleRestoreDownload} variant="outline">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download restore-db.ps1
        </Button>
      </div>
    </div>
  );
};
