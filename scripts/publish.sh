#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/publish.sh [patch|minor|major] [--otp CODE]
# Steps:
#   1. Build all packages (pnpm turbo build)
#   2. Git add + commit (if there are changes)
#   3. Bump version in packages/mcp-server
#   4. npm publish --access public
#   5. Git push with tags

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
BUMP="${1:-patch}"
OTP_FLAG=""
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --otp)
      OTP_FLAG="--otp $2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major] [--otp CODE]"
  exit 1
fi

cd "$ROOT_DIR"

echo "==> Step 1: Building all packages..."
pnpm turbo build

echo "==> Step 2: Committing changes (if any)..."
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "chore: pre-publish build"
else
  echo "    No changes to commit."
fi

echo "==> Step 3: Bumping version ($BUMP)..."
cd packages/mcp-server
NEW_VERSION=$(npm version "$BUMP" --no-git-tag-version)
echo "    New version: $NEW_VERSION"

cd "$ROOT_DIR"
git add -A
git commit -m "chore: release mcp-server $NEW_VERSION"
git tag "$NEW_VERSION"

echo "==> Step 4: Publishing to npm..."
cd packages/mcp-server
# shellcheck disable=SC2086
npm publish --access public $OTP_FLAG

echo "==> Step 5: Pushing to remote..."
cd "$ROOT_DIR"
git push origin main --tags

echo ""
echo "Published mcp-server $NEW_VERSION successfully!"
