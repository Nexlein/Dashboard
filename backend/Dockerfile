FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# hadolint ignore=DL3018
RUN apk add --no-cache openssl
# hadolint ignore=DL3060
RUN npm ci --omit=dev \
    && npm cache clean --force
COPY . .
RUN npx prisma generate
EXPOSE 8080
# Migrations are handled by the dedicated 'migrate' service in docker-compose
CMD ["node", "index.js"]
