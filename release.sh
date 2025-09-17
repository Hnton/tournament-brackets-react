#!/bin/bash

# Release Script for Tournament Brackets
# Usage: ./release.sh [patch|minor|major]

set -e

# Default to patch if no argument provided
RELEASE_TYPE=${1:-patch}

echo "🚀 Starting $RELEASE_TYPE release process..."

# Make sure we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Please switch to main/master branch before releasing"
    exit 1
fi

# Make sure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit your changes."
    git status --short
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm test

# Update version
echo "📝 Updating version..."
NEW_VERSION=$(npm version $RELEASE_TYPE --no-git-tag-version)
echo "New version: $NEW_VERSION"

# Update package-lock.json
npm install --package-lock-only

# Commit version changes
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
git tag $NEW_VERSION
git push origin master
git push origin $NEW_VERSION

echo "✅ Release $NEW_VERSION created successfully!"
echo "📦 GitHub Actions will now build and publish the release automatically"
echo "🔗 Check progress at: https://github.com/Hnton/tournament-brackets-react/actions"

# If GitHub CLI is available, attempt to create a GitHub release and upload local artifacts
if command -v gh >/dev/null 2>&1; then
    echo "📣 Creating GitHub release via gh CLI..."
    gh release create "$NEW_VERSION" out/* --title "$NEW_VERSION" --notes "Release $NEW_VERSION" || echo "⚠️ gh release failed or no artifacts found; continue"
else
    echo "ℹ️ gh CLI not found — release will be created by CI workflow when it finishes building artifacts."
fi