# Release Script for Tournament Brackets (PowerShell)
# Usage: .\release.ps1 [patch|minor|major]

param(
    [Parameter(Position=0)]
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

# Update version
Write-Host "📝 Updating version..." -ForegroundColor Yellow
$null = npm version $ReleaseType --no-git-tag-version
# Read the updated version from package.json to avoid parsing npm stdout (which can include postversion output)
$pkg = Get-Content package.json | Out-String | ConvertFrom-Json
$newVersion = $pkg.version
Write-Host "New version: $newVersion" -ForegroundColor Green

# Update package-lock.json
npm install --package-lock-only

# Commit version changes
git add package.json package-lock.json
git commit -m "chore: bump version to $newVersion"

# Create and push v-prefixed tag (GitHub Actions listens for tags like v1.2.3)
$tagName = "v$newVersion"
git tag $tagName
git push origin master
git push origin $tagName

Write-Host "✅ Release $newVersion created successfully!" -ForegroundColor Green
Write-Host "📦 GitHub Actions will now build and publish the release automatically" -ForegroundColor Blue
Write-Host "-> Check progress at: https://github.com/Hnton/tournament-brackets-react/actions" -ForegroundColor Blue