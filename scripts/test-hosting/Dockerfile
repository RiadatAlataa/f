# TEST HOSTING image — backend only, synthetic data only, Node.js 22.
# Uses the committed bun.lock with --frozen-lockfile (package-lock.json is out of sync, so `npm ci` cannot be used).
FROM oven/bun:1 AS bun

FROM node:22-slim
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# Server bundle only (the website stays on Vercel); a stub page keeps the default "/" health check green.
RUN npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs \
 && printf '<!doctype html><meta charset="utf-8"><title>Test backend</title><p>Test backend - synthetic data only</p>' > dist/index.html \
 && rm -f /usr/local/bin/bun

# 256 MB containers: keep the V8 heap below the container limit so GC runs before the kernel kills the process.
ENV NODE_ENV=production \
    STORAGE_BACKEND=json \
    APP_DB_PATH=/app/.test-data/db.json \
    NODE_OPTIONS=--max-old-space-size=176

EXPOSE 3000
CMD ["node", "scripts/test-hosting/test-start.mjs"]
