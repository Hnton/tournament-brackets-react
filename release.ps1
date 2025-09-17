# Release Script for Tournament Brackets (PowerShell)
# Usage: .\release.ps1 [patch|minor|major]

param(
    [Parameter(Position = 0)]
    [ValidateSet("patch", "minor", "major")]
    [string]$ReleaseType = "patch"
)

Write-Host "🚀 Starting $ReleaseType release process..." -ForegroundColor Green

# Make sure we're on the main branch
$currentBranch = git branch --show-current
if ($currentBranch -ne "master" -and $currentBranch -ne "main") {
    Write-Host "❌ Please switch to main/master branch before releasing" -ForegroundColor Red
    exit 1
}

# Make sure working directory is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "❌ Working directory is not clean. Please commit your changes." -ForegroundColor Red
    git status --short
    exit 1
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed!" -ForegroundColor Red
    exit 1
}

# Update version (use npm to update package.json but avoid capturing noisy stdout)
Write-Host "📝 Updating version..." -ForegroundColor Yellow
npm version $ReleaseType --no-git-tag-version --allow-same-version | Out-Null

# Read the new version string from package.json directly
$pkg = Get-Content -Raw -Path package.json | ConvertFrom-Json
$newVersion = $pkg.version
Write-Host "New version: $newVersion" -ForegroundColor Green

# Update package-lock.json
npm install --package-lock-only

# Commit version changes
git add package.json package-lock.json
git commit -m "chore: bump version to $newVersion"

# Create and push tag (use explicit refspecs)
git tag $newVersion
git push origin HEAD
git push origin --tags

Write-Host "✅ Release $newVersion created successfully!" -ForegroundColor Green
Write-Host "📦 GitHub Actions will now build and publish the release automatically" -ForegroundColor Blue
Write-Host "-> Check progress at: https://github.com/Hnton/tournament-brackets-react/actions" -ForegroundColor Blue

# If gh CLI is present, try to create a release from local artifacts (non-fatal)
try {
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        Write-Host "📣 Creating GitHub release via gh CLI..." -ForegroundColor Green
        try {
            # Resolve repo in OWNER/REPO format: prefer env var, fall back to git remote parsing
            $repo = $env:GITHUB_REPOSITORY
            if (-not $repo -or $repo -eq '') {
                $remoteUrl = (git config --get remote.origin.url) -as [string]
                if ($remoteUrl) {
                    # handle git@github.com:owner/repo.git and https://github.com/owner/repo.git
                    if ($remoteUrl -match 'git@[^:]+:(.+)') {
                        $repo = $Matches[1]
                    }
                    elseif ($remoteUrl -match 'https?://[^/]+/(.+)') {
                        $repo = $Matches[1]
                    }
                    # strip .git suffix
                    if ($repo -and $repo.EndsWith('.git')) { $repo = $repo.Substring(0, $repo.Length - 4) }
                }
            }

            # Collect assets safely
            $assets = Get-ChildItem -Path .\out -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }

            # Build gh args: tag first, then flags, then assets (assets last)
            $ghArgs = @($newVersion, '--title', $newVersion, '--notes', "Release $newVersion")
            if ($repo) { $ghArgs += @('-R', $repo) }
            if ($assets -and $assets.Count -gt 0) { $ghArgs += $assets }

            & gh release create @ghArgs
        }
        catch {
            Write-Host "⚠️ gh release failed or no artifacts found; continuing. Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "ℹ️ gh CLI not found — release will be created by CI workflow when it finishes building artifacts." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️ gh release failed or no artifacts found; continuing." -ForegroundColor Yellow
}