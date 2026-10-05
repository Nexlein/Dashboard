# Build context: repository root (see docker-compose.yml).
FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
# Workspace manifests first so the dependency layer is cached across source edits.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/
# husky (root dev dependency) is not installed with -w: drop the git-hook `prepare` script.
RUN npm pkg delete scripts.prepare && npm ci -w shared -w backend
COPY shared ./shared
RUN npm run build -w shared
COPY backend ./backend
RUN cd backend && npx prisma generate

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/
RUN npm pkg delete scripts.prepare \
    && npm ci -w backend --omit=dev \
    && npm cache clean --force
COPY --from=builder /app/shared/dist ./shared/dist
COPY backend ./backend
COPY --from=builder /app/backend/src/generated ./backend/src/generated
WORKDIR /app/backend
EXPOSE 8080
# Node runs the TypeScript sources directly (type stripping; CI type-checks them).
# Apply pending migrations, then start. Prisma holds an advisory lock, so replicas
# starting together apply each migration once.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node src/server.ts"]
