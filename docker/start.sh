#!/bin/sh
set -eu

npx wrangler d1 migrations apply affinity-india-local \
  --local \
  --config /app/docker/wrangler.jsonc \
  --persist-to /data

exec npx wrangler dev \
  --config /app/docker/wrangler.jsonc \
  --ip 0.0.0.0 \
  --port 3000 \
  --persist-to /data
