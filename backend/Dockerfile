FROM node:20-alpine
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
# NOTE: prisma db push runs on every start - consider using migrate deploy for production
CMD ["sh", "-c", "npx prisma db push && npm start"]
