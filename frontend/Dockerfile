# Build context: repository root (see docker-compose.yml).
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/
# husky (root dev dependency) is not installed with -w: drop the git-hook `prepare` script.
RUN npm pkg delete scripts.prepare && npm ci -w shared -w frontend
COPY shared ./shared
RUN npm run build -w shared
COPY frontend ./frontend
RUN npm run build -w frontend

FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
