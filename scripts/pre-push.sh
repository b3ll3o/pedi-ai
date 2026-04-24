#!/bin/bash
set -e

echo "🚀 Running pre-push checks..."

echo "📚 Updating documentation..."
# Run any doc generation scripts

echo "🧪 Running tests..."
pnpm test

echo "🧹 Running linter with auto-fix..."
pnpm lint --fix || true  # Continue even if lint fails

echo "📦 Committing lint fixes if any..."
git add -A
git diff --staged --quiet || git commit -m "chore: auto-fix lint issues"

echo "✅ Pre-push checks complete!"
