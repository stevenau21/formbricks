
$ErrorActionPreference = "Stop"

$TargetUrl = "http://localhost:3000"
# Absolute path to the icon we found
$IconPath = "c:\dev\projects\formbricks\apps\web\public\favicon.ico"
$ShortcutName = "Formbricks.lnk"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath $ShortcutName

# Browser Paths to check (Chrome then Edge)
$ChromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
$ChromePathX86 = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
$EdgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$EdgePath64 = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"

$BrowserExe = $null

if (Test-Path $ChromePath) {
    $BrowserExe = $ChromePath
} elseif (Test-Path $ChromePathX86) {
    $BrowserExe = $ChromePathX86
} elseif (Test-Path $EdgePath) {
    $BrowserExe = $EdgePath
} elseif (Test-Path $EdgePath64) {
    $BrowserExe = $EdgePath64
}

$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

if ($BrowserExe) {
    Write-Host "Found browser at: $BrowserExe"
    $Shortcut.TargetPath = $BrowserExe
    # --app runs it in "Application Mode" (no address bar)
    $Shortcut.Arguments = "--app=$TargetUrl"
    $Shortcut.Description = "Formbricks Desktop App"
} else {
    Write-Host "No Chrome/Edge found. Creating standard URL shortcut."
    # Fallback to default browser opener
    $Shortcut.TargetPath = "cmd.exe"
    $Shortcut.Arguments = "/c start $TargetUrl"
}

if (Test-Path $IconPath) {
    $Shortcut.IconLocation = $IconPath
} else {
    Write-Warning "Icon not found at $IconPath. Using default icon."
}

$Shortcut.Save()

Write-Host "Successfully created shortcut on Desktop: $ShortcutPath"
