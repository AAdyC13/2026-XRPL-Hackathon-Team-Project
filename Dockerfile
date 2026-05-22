FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY client ./client
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

USER node

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
