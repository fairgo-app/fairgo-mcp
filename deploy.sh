#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: ./deploy.sh [prod|dev]"
  echo ""
  echo "  prod   Deploy to production (mcp.fairgo.app)"
  echo "  dev    Deploy to dev (fairgo-mcp.nathaniel-ramm.workers.dev)"
  echo ""
  echo "Defaults to dev if no argument given."
  exit 1
}

MODE="${1:-dev}"

case "$MODE" in
  prod|production)
    ENV_FLAG="--env production"
    LABEL="production (mcp.fairgo.app)"
    ;;
  dev|preview)
    ENV_FLAG=""
    LABEL="dev (fairgo-mcp.nathaniel-ramm.workers.dev)"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown mode: $MODE"
    usage
    ;;
esac

echo "==> Deploying to $LABEL..."
npx wrangler deploy $ENV_FLAG

echo "==> Done!"
