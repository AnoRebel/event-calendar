#!/bin/sh
set -e

# Ensure the data directory exists (mounted as a volume in production so the
# embedded libSQL database persists across deployments).
mkdir -p "$(dirname "${LIBSQL_URL#file:}")" 2>/dev/null || true

# Apply any pending migrations against the embedded libSQL database, then start
# the Nitro server. The migration runner is idempotent.
echo "[entrypoint] running migrations…"
node scripts/migrate-runtime.mjs

echo "[entrypoint] starting server…"
exec node server/index.mjs
