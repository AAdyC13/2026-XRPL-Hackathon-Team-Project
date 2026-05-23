FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/
COPY vite.config.ts tsconfig.json tsconfig.node.json components.json ./

RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 3001
USER node
CMD ["node", "dist/index.js"]
