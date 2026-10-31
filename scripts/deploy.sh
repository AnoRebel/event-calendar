#!/usr/bin/env bash
# Docker Compose deployment helper for Event Calendar.
#
#   bash scripts/deploy.sh               # build, back up the database, start, verify
#   bash scripts/deploy.sh rollback      # start the previously deployed image again
#   bash scripts/deploy.sh health-check  # probe /api/health
#
# Reads NUXT_APP_SECRET (and the other variables in .env.example) from the
# environment or ./.env. Migrations run automatically when the container starts.
set -euo pipefail

COMPOSE="docker compose"
SERVICE="app"
IMAGE="event-calendar"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
HEALTH_URL="${HEALTH_URL:-http://localhost:${PORT:-3000}/api/health}"

log() { printf '\033[0;32m[%s]\033[0m %s\n' "$(date +'%H:%M:%S')" "$1"; }
fail() { printf '\033[0;31m[error]\033[0m %s\n' "$1" >&2; exit 1; }

[ -f .env ] && set -a && . ./.env && set +a

checks() {
  command -v docker >/dev/null || fail "docker is not installed"
  $COMPOSE version >/dev/null 2>&1 || fail "the docker compose plugin is not installed"
  [ "${#NUXT_APP_SECRET}" -ge 32 ] 2>/dev/null || fail "NUXT_APP_SECRET must be set (at least 32 characters): openssl rand -base64 32"
}

backup() {
  # Only the embedded file database lives in the container volume.
  if [[ "${LIBSQL_URL:-file:/app/.data/events.db}" == file:* ]] && $COMPOSE ps --status running "$SERVICE" -q | grep -q .; then
    mkdir -p "$BACKUP_DIR"
    local target="$BACKUP_DIR/events-$(date +%Y%m%d-%H%M%S).db"
    $COMPOSE cp "$SERVICE:/app/.data/events.db" "$target" && log "database backed up to $target"
  fi
}

health_check() {
  for _ in $(seq 1 30); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      log "healthy: $HEALTH_URL"
      return 0
    fi
    sleep 2
  done
  return 1
}

deploy() {
  checks
  backup
  # Keep the running image so a failed deploy can roll back to it.
  if docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then
    docker tag "$IMAGE:latest" "$IMAGE:previous"
  fi
  log "building"
  $COMPOSE build "$SERVICE" # tags $IMAGE:latest (see docker-compose.yml)
  log "starting"
  $COMPOSE up -d "$SERVICE"
  if ! health_check; then
    log "health check failed — rolling back"
    rollback
    fail "deployment failed; the previous image is running again"
  fi
  log "deployed"
}

rollback() {
  docker image inspect "$IMAGE:previous" >/dev/null 2>&1 || fail "no previous image to roll back to"
  docker tag "$IMAGE:previous" "$IMAGE:latest"
  $COMPOSE up -d --no-build --force-recreate "$SERVICE"
  health_check || fail "the previous image is not healthy either"
  log "rolled back"
}

case "${1:-deploy}" in
  deploy) deploy ;;
  rollback) rollback ;;
  health-check) health_check || fail "unhealthy: $HEALTH_URL" ;;
  *) echo "usage: $0 [deploy|rollback|health-check]" >&2; exit 2 ;;
esac
