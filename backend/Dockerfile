FROM node:20-alpine AS builder
WORKDIR /app
# Copy root package.json and lockfile
COPY package*.json ./
# Copy workspace packages package.jsons
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/
RUN apk add --no-cache openssl
# Install all dependencies
RUN npm install
# Copy shared workspace source
COPY shared ./shared
RUN npm run build --workspace=shared
# Copy backend source
COPY backend ./backend
# Generate Prisma
RUN cd backend && npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app/backend
RUN apk add --no-cache openssl
# Copy root files needed for workspaces
COPY package*.json /app/
COPY shared/package*.json /app/shared/
COPY backend/package*.json ./
# Copy compiled shared library
COPY --from=builder /app/shared /app/shared
# Install only production dependencies
# npm ci --omit=dev in workspaces requires special handling, so we run npm install --omit=dev
RUN npm install --omit=dev
# Copy backend built files
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY backend .
EXPOSE 8080
CMD ["npm", "start"]
