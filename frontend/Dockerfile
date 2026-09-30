FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
# hadolint ignore=DL3016,DL3060
RUN npm install -g npm@latest \
    && npm install \
    && npm cache clean --force
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
