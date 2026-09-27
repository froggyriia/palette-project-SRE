# --- build stage -------------------------------------------------------
# Pinned to the same major Node version used for local development, so
# `npm run build` behaves the same in Docker as on a dev machine
# (12-factor: Dev/prod parity).
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- release/run stage --------------------------------------------------
# A separate, much smaller runtime image: it only ever contains the built
# static assets plus nginx, never Node, npm, or source files (12-factor:
# Build, release, run — the build stage's toolchain doesn't leak into the
# artifact that actually runs).
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.d/40-inject-env.sh

# nginx:alpine's own entrypoint already runs every executable script in
# /docker-entrypoint.d/ before starting nginx, so this one just needs to
# be executable — no ENTRYPOINT override needed here, which keeps the
# image's normal signal handling (graceful SIGTERM/SIGQUIT shutdown from
# nginx itself) intact (12-factor: Disposability).
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 80
