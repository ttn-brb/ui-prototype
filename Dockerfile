FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=true
COPY --from=build /app/build ./build
COPY view ./view
COPY static ./static

ENTRYPOINT ["node", "build/cli.js", "-h", "0.0.0.0", "-p", "80"]
