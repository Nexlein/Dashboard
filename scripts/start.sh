#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! docker compose version >/dev/null 2>&1; then
    echo 'Install Docker with Compose v2.24+ first.' >&2
    exit 1
fi
if ! docker info >/dev/null 2>&1; then
    echo 'Start Docker Desktop or the Docker service first.' >&2
    exit 1
fi
docker compose up --build --wait --wait-timeout 180
echo 'Dashboard: http://localhost:8081'
echo 'Local inbox: http://localhost:8025'
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:8081 >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open http://localhost:8081
fi
