#!/bin/sh
set -eu

# Runs as one of nginx:alpine's own /docker-entrypoint.d/ scripts — the
# base image's entrypoint executes every script in that directory and
# only then execs nginx itself, so this script must just do its one job
# (write the config file) and return, not start nginx.
#
# This generates the runtime config file that index.html loads before the
# app bundle. It's what decouples the build stage from the release stage
# (12-factor: Build, release, run) — the image produced by `docker build`
# is identical whether it ends up in dev, staging or prod; only this
# file, written from the container's environment at start time, differs.
cat > /usr/share/nginx/html/env-config.js << JSEOF
window.__ENV__ = {
  VITE_API_URL: "${VITE_API_URL:-}"
};
JSEOF
