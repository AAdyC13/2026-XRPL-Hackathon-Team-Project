FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.node.json vite.config.ts components.json prisma.config.ts ./
COPY prisma ./prisma
COPY client ./client
COPY shared ./shared

RUN pnpm vite build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

COPY prisma.config.ts ./
COPY prisma ./prisma
COPY server ./server
COPY shared ./shared
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder /app/dist/public ./dist/public

RUN sed -i 's/\r$//' ./scripts/docker-entrypoint.sh \
  && chmod +x ./scripts/docker-entrypoint.sh \
  && pnpm db:generate \
  && chown -R node:node /app

USER node
EXPOSE 3000
CMD ["./scripts/docker-entrypoint.sh"]
