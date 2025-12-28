$ErrorActionPreference = "Stop"
$backupDir = Join-Path $PSScriptRoot "backups"
$containerName = "formbricks-postgres-1"
$minioContainerName = "formbricks-minio-1"
$dbUser = "postgres"
$dbName = "formbricks"
$bucketName = "formbricks"

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

    $fallback = Join-Path $env:USERPROFILE "Downloads"
    return $fallback
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
                if ($e -match "^minio-data[/\\]") { $hasMinioData = $true }
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

            if ($line -eq '\.') { break }
            if ($line) { $count++ }
        }

        if (-not $inCopy) { return $null }
        return $count
    } finally {
        $reader.Dispose()
    }
}

Write-Host "WARNING: This will OVERWRITE the current database and files with a backup." -ForegroundColor Yellow
Write-Host "Make sure you have a backup of the current state before proceeding." -ForegroundColor Yellow
Write-Host ""

# List zip backups
$downloadsDir = Get-DownloadsDirectory
$projectBackupsDir = $backupDir

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

if (-not (Test-Path $downloadsDir)) {
    Write-Host "   ⚠️ Downloads folder path does not exist: $downloadsDir" -ForegroundColor Yellow
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
    Write-Host "[$i] $($b.Name)  ($($b.LastWriteTime))  [$dbFlag, $minioFlag, ${sizeMb}MB]"
    Write-Host "    Location: $($b.DirectoryName)" -ForegroundColor DarkGray
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

    $tempDir = Join-Path $env:TEMP "formbricks-restore-$((Get-Date).ToString('yyyyMMddHHmmss'))"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

    try {
        Write-Host " Extracting backup..." -ForegroundColor Cyan
        Expand-Archive -Path $selectedFile.FullName -DestinationPath $tempDir -Force

        # 1. Restore Database
        $sqlFile = Join-Path $tempDir "database.sql"
        if (Test-Path $sqlFile) {
            $sqlSizeKb = [Math]::Round(((Get-Item $sqlFile).Length / 1KB), 1)
            $surveyRows = Get-SurveyRowCountFromDump -SqlPath $sqlFile
            Write-Host " Backup DB dump size: ${sqlSizeKb}KB" -ForegroundColor DarkGray
            if ($null -ne $surveyRows) {
                Write-Host " Surveys contained in backup: $surveyRows" -ForegroundColor DarkGray
                if ($surveyRows -le 2) {
                    Write-Host "   WARNING: This backup contains $surveyRows survey(s). If you expected your 4 created forms, you likely selected the wrong backup (or backed up before creating them)." -ForegroundColor Yellow
                }
            } else {
                Write-Host "   (Could not detect survey count in the dump.)" -ForegroundColor DarkGray
            }

            Write-Host " Restoring database..." -ForegroundColor Cyan
            docker cp $sqlFile "$containerName`:/tmp/restore.sql"
            
            # Terminate existing connections to the database to allow drop/restore
            docker exec $containerName psql -U $dbUser -d postgres -c "SELECT pid, pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$dbName' AND pid <> pg_backend_pid();" | Out-Null
            
            # Drop and Recreate DB to ensure clean state
            Write-Host "   Recreating database..." -NoNewline
            docker exec $containerName psql -U $dbUser -d postgres -c "DROP DATABASE IF EXISTS $dbName;"
            docker exec $containerName psql -U $dbUser -d postgres -c "CREATE DATABASE $dbName;"
            Write-Host " Done." -ForegroundColor Green

            # Restore schema and data
            Write-Host "   Importing data..." -NoNewline
            docker exec $containerName psql -U $dbUser -d $dbName -f "/tmp/restore.sql" > $null
            docker exec $containerName rm "/tmp/restore.sql"
            Write-Host " Done." -ForegroundColor Green
        } else {
            Write-Host "   WARNING: No database.sql found." -ForegroundColor Yellow
        }

        # 2. Restore Files (MinIO)
        $minioDataDir = Join-Path $tempDir "minio-data"
        if (Test-Path $minioDataDir) {
            Write-Host " Restoring files to MinIO..." -ForegroundColor Cyan
            
            # The backup contains minio-data/bucket-name/...
            # We want to copy the contents of minio-data to /data in the container.
            
            # Check if the bucket directory exists in the container
            # Actually, we can just copy everything from minio-data to /data
            
            docker cp "$minioDataDir/." "$minioContainerName`:/data/"
            Write-Host " Files restored to MinIO." -ForegroundColor Green
            
        } else {
               Write-Host "No 'minio-data' folder found in backup. Skipping file restore." -ForegroundColor Gray
        }

    } catch {
        Write-Error "An error occurred during restore: $_"
    } finally {
        Write-Host "Cleaning up temp files..." -ForegroundColor Gray
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host " Restore completed!" -ForegroundColor Green

} else {
    Write-Error "Invalid selection."
}
