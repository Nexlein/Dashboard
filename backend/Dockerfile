FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# hadolint ignore=DL3018,DL3016,DL3060
RUN apk add --no-cache openssl \
    && npm install -g npm@latest \
    && npm install --omit=dev \
    && npm cache clean --force
COPY . .
RUN npx prisma generate \
    && rm -rf /app/package-lock.json \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx
EXPOSE 8080
# Migrations are handled by the dedicated 'migrate' service in docker-compose
CMD ["node", "index.js"]
