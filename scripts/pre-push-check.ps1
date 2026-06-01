# Scan tracked-ready sources for common secret patterns before git push.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$patterns = @(
    'sk-[a-zA-Z0-9]{20,}',
    'sk-proj-[a-zA-Z0-9_-]{20,}',
    'sk-ant-[a-zA-Z0-9_-]{20,}',
    'ghp_[a-zA-Z0-9]{20,}',
    'github_pat_[a-zA-Z0-9_]{20,}',
    'AIza[0-9A-Za-z_-]{20,}',
    'xox[baprs]-[0-9A-Za-z-]{10,}',
    'AKIA[0-9A-Z]{16}',
    'eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]{20,}'
)

$scanRoots = @(
    "apps", "packages", "sidecar", "cli", "server", "scripts", "docs",
    "examples", "bundle", ".github", "qa"
)
$extensions = @("*.ts", "*.tsx", "*.rs", "*.json", "*.md", "*.yml", "*.yaml", "*.env*", "*.ps1", "*.toml")

$hits = @()
foreach ($dir in $scanRoots) {
    $path = Join-Path $Root $dir
    if (-not (Test-Path $path)) { continue }
    foreach ($ext in $extensions) {
        Get-ChildItem -Path $path -Filter $ext -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.FullName -match '\\node_modules\\|\\target\\|\\dist\\') { return }
            $content = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { return }
            foreach ($pat in $patterns) {
                if ($content -match $pat) {
                    $hits += [PSCustomObject]@{ File = $_.FullName.Replace("$Root\", ""); Pattern = $pat }
                }
            }
        }
    }
}

$forbiddenFiles = @(
    ".env", ".env.local", "credentials.json", "minisign.key", "auth.json"
)
foreach ($name in $forbiddenFiles) {
    Get-ChildItem -Path $Root -Filter $name -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\node_modules\\|\\target\\' } |
        ForEach-Object { $hits += [PSCustomObject]@{ File = $_.FullName.Replace("$Root\", ""); Pattern = "forbidden file" } }
}

if ($hits.Count -gt 0) {
    Write-Host "FAIL: Possible secrets found:" -ForegroundColor Red
    $hits | Format-Table -AutoSize
    exit 1
}

Write-Host "OK: No obvious secrets in source tree." -ForegroundColor Green
exit 0
