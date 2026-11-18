#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example and configure the VPS secrets first." >&2
  exit 1
fi

release="${1:-}"
if [[ ! "$release" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Usage: deploy/blue-green-deploy.sh <release-tag>" >&2
  exit 2
fi

app_image="onsite:$release"
migrator_image="onsite-migrator:$release"
compose=(docker compose --env-file .env -f deploy/compose.yml)
active_file="deploy/nginx/upstreams/active.conf"
active_config="$(cat "$active_file")"

case "$active_config" in
  *app-blue:3000*)
    active="app-blue"
    inactive="app-green"
    new_upstream="server app-green:3000;"
    ;;
  *app-green:3000*)
    active="app-green"
    inactive="app-blue"
    new_upstream="server app-blue:3000;"
    ;;
  *)
    echo "Unknown active upstream configuration; refusing to deploy." >&2
    exit 1
    ;;
esac

active_container_id="$("${compose[@]}" ps -q "$active" 2>/dev/null || true)"
if [[ -z "$active_container_id" ]]; then
  active="none"
  inactive="app-blue"
  new_upstream="server app-blue:3000;"
fi

docker build --target runner -f deploy/Dockerfile -t "$app_image" .
docker build --target migrator -f deploy/Dockerfile -t "$migrator_image" .
export ONSITE_IMAGE="$app_image" ONSITE_MIGRATOR_IMAGE="$migrator_image"
"${compose[@]}" up -d postgres
"${compose[@]}" run --rm migrator
"${compose[@]}" up -d --no-deps --force-recreate "$inactive"

container_id="$("${compose[@]}" ps -q "$inactive")"
if [[ -z "$container_id" ]]; then
  echo "Candidate container was not created." >&2
  exit 1
fi

for attempt in $(seq 1 60); do
  health="$(docker inspect --format '{{.State.Health.Status}}' "$container_id")"
  if [[ "$health" == "healthy" ]]; then
    break
  fi
  if [[ "$health" == "unhealthy" ]]; then
    docker logs --tail 80 "$container_id" >&2
    echo "Candidate failed its health check; leaving $active live." >&2
    exit 1
  fi
  sleep 2
done

if [[ "$(docker inspect --format '{{.State.Health.Status}}' "$container_id")" != "healthy" ]]; then
  docker logs --tail 80 "$container_id" >&2
  echo "Candidate did not become healthy; leaving $active live." >&2
  exit 1
fi

rollback() {
  if [[ "$active" != "none" ]]; then
    printf '%s\n' "$active_config" > "$active_file"
    "${compose[@]}" exec -T proxy nginx -t
    "${compose[@]}" exec -T proxy nginx -s reload
    echo "Traffic restored to $active." >&2
  else
    echo "Initial deployment failed; no previous app was available to restore." >&2
  fi
}

temporary_config="${active_file}.new"
printf '%s\n' "$new_upstream" > "$temporary_config"
mv "$temporary_config" "$active_file"

if ! "${compose[@]}" up -d proxy; then
  rollback
  exit 1
fi

if ! "${compose[@]}" exec -T proxy nginx -t || ! "${compose[@]}" exec -T proxy nginx -s reload; then
  rollback
  exit 1
fi

app_origin="$(grep -E '^APP_ORIGIN=' .env | cut -d= -f2-)"
if [[ -z "$app_origin" ]] || ! curl --fail --silent --show-error --max-time 10 "$app_origin/api/health" >/dev/null; then
  rollback
  exit 1
fi

echo "Deployment $release is healthy on $inactive. Previous app $active is retained for immediate rollback."
