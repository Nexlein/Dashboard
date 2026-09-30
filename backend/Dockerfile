FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# hadolint ignore=DL3060,DL3018
RUN apk add --no-cache openssl \
    && npm install \
    && npm cache clean --force
COPY . .
RUN npx prisma generate
EXPOSE 8080
CMD ["sh", "-c", "npx prisma db push && npm start"]
