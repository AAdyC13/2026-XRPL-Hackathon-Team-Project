#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(pwd)}"
ACTION="${1:-${ACTION:-verify}}"
COMPOSE_ENV="${COMPOSE_ENV:-deploy.env}"
PREVIOUS_ENV="${PREVIOUS_ENV:-deploy.env.previous}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
PREVIOUS_COMPOSE="${PREVIOUS_COMPOSE:-docker-compose.yml.previous}"
VERIFY_ATTEMPTS="${VERIFY_ATTEMPTS:-9}"
VERIFY_INTERVAL="${VERIFY_INTERVAL:-20}"
VERIFY_WARMUP_SECONDS="${VERIFY_WARMUP_SECONDS:-50}"
VERIFY_RESTART_LIMIT="${VERIFY_RESTART_LIMIT:-2}"
VERIFY_FAIL_LIMIT="${VERIFY_FAIL_LIMIT:-4}"
VERIFY_REQUIRED_SUCCESSES="${VERIFY_REQUIRED_SUCCESSES:-3}"
IMAGE_REPO="${IMAGE_REPO:-ghcr.io/aadyc13/2026-xrpl-hackathon-team-project}"

cd "$DEPLOY_DIR"

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*"
}

load_deploy_env() {
  if [ -f "$COMPOSE_ENV" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$COMPOSE_ENV"
    set +a
  fi
}

compose_cmd() {
  load_deploy_env
  docker compose --env-file "$COMPOSE_ENV" "$@"
}

read_image_tag() {
  local env_file="$1"

  if [ ! -f "$env_file" ]; then
    return 1
  fi

  sed -n 's/^IMAGE_TAG=//p' "$env_file" | tail -n 1 | tr -d '\r'
}

container_id() {
  local service="$1"
  compose_cmd ps -q "$service"
}

container_status() {
  local container="$1"
  docker inspect "$container" --format '{{.State.Status}}'
}

restart_count() {
  local container="$1"
  docker inspect "$container" --format '{{.RestartCount}}'
}

assert_running() {
  local service="$1"
  local container
  local status

  container="$(container_id "$service")"
  if [ -z "$container" ]; then
    log "service $service has no container"
    return 1
  fi

  status="$(container_status "$container")"
  if [ "$status" != "running" ]; then
    log "service $service is $status"
    return 1
  fi
}

check_app_health() {
  compose_cmd exec -T app node -e '
    fetch("http://127.0.0.1:3000/health")
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.ok !== true || !body.data || body.data.database !== "ok") {
          console.error(JSON.stringify(body));
          process.exit(1);
        }
        console.log(JSON.stringify(body));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  '
}

verify_deploy() {
  local app_container
  local initial_restarts=0
  local current_restarts=0
  local restart_delta=0
  local consecutive_failures=0
  local consecutive_successes=0
  local attempt=1

  app_container="$(container_id app || true)"
  if [ -n "$app_container" ]; then
    initial_restarts="$(restart_count "$app_container")"
  fi

  log "starting deploy verification: warmup=${VERIFY_WARMUP_SECONDS}s attempts=$VERIFY_ATTEMPTS interval=${VERIFY_INTERVAL}s fail_limit=$VERIFY_FAIL_LIMIT restart_limit=$VERIFY_RESTART_LIMIT"

  if [ "$VERIFY_WARMUP_SECONDS" -gt 0 ]; then
    log "waiting ${VERIFY_WARMUP_SECONDS}s for db:deploy and nest start"
    sleep "$VERIFY_WARMUP_SECONDS"
  fi

  while [ "$attempt" -le "$VERIFY_ATTEMPTS" ]; do
    log "verification attempt $attempt/$VERIFY_ATTEMPTS"

    if assert_running postgres && assert_running app && check_app_health; then
      app_container="$(container_id app)"
      current_restarts="$(restart_count "$app_container")"
      restart_delta=$((current_restarts - initial_restarts))

      if [ "$restart_delta" -gt "$VERIFY_RESTART_LIMIT" ]; then
        log "app restart count increased by $restart_delta, exceeding limit $VERIFY_RESTART_LIMIT"
        consecutive_failures=$((consecutive_failures + 1))
        consecutive_successes=0
      else
        log "health ok, app restart delta=$restart_delta"
        consecutive_failures=0
        consecutive_successes=$((consecutive_successes + 1))
      fi
    else
      consecutive_failures=$((consecutive_failures + 1))
      consecutive_successes=0
      log "verification failed, consecutive_failures=$consecutive_failures"
    fi

    if [ "$consecutive_failures" -ge "$VERIFY_FAIL_LIMIT" ]; then
      log "verification failed after $consecutive_failures consecutive failures"
      return 1
    fi

    if [ "$consecutive_successes" -ge "$VERIFY_REQUIRED_SUCCESSES" ]; then
      log "deploy verification passed"
      return 0
    fi

    if [ "$attempt" -lt "$VERIFY_ATTEMPTS" ]; then
      sleep "$VERIFY_INTERVAL"
    fi

    attempt=$((attempt + 1))
  done

  log "verification ended without $VERIFY_REQUIRED_SUCCESSES consecutive successful checks"
  return 1
}

save_previous() {
  local current_tag

  current_tag="$(read_image_tag "$COMPOSE_ENV" || true)"
  if [ -z "$current_tag" ]; then
    log "no existing $COMPOSE_ENV with IMAGE_TAG; skipping previous tag save"
    return 0
  fi

  cp "$COMPOSE_ENV" "$PREVIOUS_ENV"
  if [ -f "$COMPOSE_FILE" ]; then
    cp "$COMPOSE_FILE" "$PREVIOUS_COMPOSE"
  fi
  log "saved previous deploy tag: $current_tag"
}

promote_previous() {
  local current_tag

  current_tag="$(read_image_tag "$COMPOSE_ENV")"
  cp "$COMPOSE_ENV" "$PREVIOUS_ENV"
  if [ -f "$COMPOSE_FILE" ]; then
    cp "$COMPOSE_FILE" "$PREVIOUS_COMPOSE"
  fi
  log "promoted deploy tag for future rollback: $current_tag"
}

compose_up() {
  # Free disk before pulling the new image: dangling images + builder cache only.
  # The VPS only pulls images (never builds), so pruning builder cache is safe.
  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f >/dev/null 2>&1 || true
  compose_cmd pull
  compose_cmd up -d --remove-orphans
}

prune_images() {
  local keep_current keep_previous

  keep_current="$(read_image_tag "$COMPOSE_ENV" || true)"
  keep_previous="$(read_image_tag "$PREVIOUS_ENV" || true)"

  log "pruning old ${IMAGE_REPO} images; keep current=${keep_current:-none} previous=${keep_previous:-none}"

  # Enumerate "<repo>:<tag>" for our image only, removing every tag except the
  # currently-running one, the rollback target, and the floating :latest tag.
  docker images --format '{{.Repository}}:{{.Tag}}' "${IMAGE_REPO}" \
    | while IFS= read -r ref; do
        tag="${ref##*:}"
        case "$tag" in
          "$keep_current"|"$keep_previous"|latest|"<none>") continue ;;
        esac
        log "removing image ${ref}"
        docker rmi "$ref" >/dev/null 2>&1 || log "could not remove ${ref} (in use?)"
      done

  # Clean up any layers left dangling by the removals above.
  docker image prune -f >/dev/null 2>&1 || true
}

rollback() {
  local previous_tag

  if [ -f "$PREVIOUS_ENV" ]; then
    previous_tag="$(read_image_tag "$PREVIOUS_ENV" || true)"
  else
    previous_tag=""
  fi

  if [ -z "$previous_tag" ]; then
    log "no previous deploy tag found; cannot rollback"
    return 1
  fi

  cp "$PREVIOUS_ENV" "$COMPOSE_ENV"
  if [ -f "$PREVIOUS_COMPOSE" ]; then
    cp "$PREVIOUS_COMPOSE" "$COMPOSE_FILE"
    log "restored previous compose file"
  fi
  log "rolling back to deploy tag: $previous_tag"

  compose_up

  VERIFY_WARMUP_SECONDS="${ROLLBACK_VERIFY_WARMUP_SECONDS:-45}" \
  VERIFY_ATTEMPTS="${ROLLBACK_VERIFY_ATTEMPTS:-5}" \
  VERIFY_INTERVAL="${ROLLBACK_VERIFY_INTERVAL:-20}" \
  VERIFY_FAIL_LIMIT="${ROLLBACK_VERIFY_FAIL_LIMIT:-4}" \
  VERIFY_REQUIRED_SUCCESSES="${ROLLBACK_VERIFY_REQUIRED_SUCCESSES:-2}" \
    verify_deploy
}

case "$ACTION" in
  save-previous)
    save_previous
    ;;
  verify)
    verify_deploy
    ;;
  up)
    compose_up
    ;;
  rollback)
    rollback
    ;;
  promote-previous)
    promote_previous
    ;;
  prune-images)
    prune_images
    ;;
  *)
    log "unknown action: $ACTION"
    exit 2
    ;;
esac
