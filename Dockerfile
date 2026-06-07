FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

ENV HUSKY=0
RUN pnpm install --frozen-lockfile

COPY . .
# Raise V8 heap for the build only — Rollup's chunk rendering peaks above the
# ~2 GB the runtime auto-caps to in the Alpine builder (OOM during build).
RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm build

EXPOSE 3000

CMD ["sh", "-c", "pnpm db:migrate && node .output/server/index.mjs"]
