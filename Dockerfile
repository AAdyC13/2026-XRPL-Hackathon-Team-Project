FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

COPY nest-cli.json prisma.config.ts tsconfig.backend.json tsconfig.json tsconfig.node.json vite.config.ts components.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
COPY client ./client
COPY shared ./shared

RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

COPY prisma.config.ts ./prisma.config.ts
COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000
USER node
CMD ["sh", "-c", "pnpm db:deploy && node dist/src/main.js"]
