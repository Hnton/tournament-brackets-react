Param(
    [string]$Version
)

if (-not $Version) {
    $pkg = Get-Content -Raw -Path package.json | ConvertFrom-Json
    $Version = $pkg.version
}

# Resolve repo
$repo = $env:GITHUB_REPOSITORY
if (-not $repo -or $repo -eq '') {
    $remoteUrl = (git config --get remote.origin.url) -as [string]
    if ($remoteUrl -match 'git@[^:]+:(.+)') { $repo = $Matches[1] }
    elseif ($remoteUrl -match 'https?://[^/]+/(.+)') { $repo = $Matches[1] }
    if ($repo -and $repo.EndsWith('.git')) { $repo = $repo.Substring(0, $repo.Length - 4) }
}

Write-Host "Resolved repo: $repo"

# Collect assets
$assets = Get-ChildItem -Path .\out -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
Write-Host "Found assets:"
if ($assets -and $assets.Count -gt 0) { $assets | ForEach-Object { Write-Host "  $_" } } else { Write-Host "  (none)" }

# Build gh args
$ghArgs = @($Version, '--title', $Version, '--notes', "Release $Version")
if ($repo) { $ghArgs += @('-R', $repo) }
if ($assets -and $assets.Count -gt 0) { $ghArgs += $assets }

Write-Host "\nFinal gh args (safe preview):"
$ghArgs | ForEach-Object { Write-Host "  $_" }

Write-Host "\n(End of dry-run)"
