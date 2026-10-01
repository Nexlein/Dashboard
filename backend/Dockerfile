FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm install
COPY . .
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
