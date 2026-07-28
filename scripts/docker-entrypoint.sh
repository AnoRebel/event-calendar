#!/bin/sh
set -e

echo "[entrypoint] starting as $(id -un); LIBSQL_URL=${LIBSQL_URL}"

# The database directory is a mounted volume; on a fresh volume it is root-owned,
# so the non-root app user cannot write to it. Running as root here, we ensure it
# exists and hand ownership to the app user, then drop privileges.
DATA_DIR="$(dirname "${LIBSQL_URL#file:}")"
echo "[entrypoint] ensuring data dir: ${DATA_DIR}"
mkdir -p "$DATA_DIR"
chown -R nuxtjs:nodejs "$DATA_DIR" || echo "[entrypoint] warn: chown failed (continuing)"

# Apply pending migrations (idempotent), then start the server — both as the
# non-root app user.
echo "[entrypoint] running migrations…"
su-exec nuxtjs:nodejs node scripts/migrate-runtime.mjs

echo "[entrypoint] starting server…"
exec su-exec nuxtjs:nodejs node server/index.mjs
