FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
