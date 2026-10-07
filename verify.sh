#!/bin/sh
set -eu
cd "$(dirname "$0")"
npm run build
docker compose exec -T --user node atproto node /sandbox/dist/isolation-test.js
docker compose exec -T --user node gateway node /sandbox/dist/isolation-test.js
node dist/smoke-test.js
backend=$(docker compose ps -q atproto)
docker inspect "$backend" | node dist/topology-test.js backend
container=$(docker compose ps -q gateway)
docker inspect "$container" | node dist/topology-test.js gateway
docker network inspect loftet-isolated-sandbox_isolated | node dist/topology-test.js network
