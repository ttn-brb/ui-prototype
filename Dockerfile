FROM node:16 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production=true
COPY --from=build /app/build ./build
COPY view ./view
COPY static ./static

ENTRYPOINT ["node", "build/cli.js", "-h", "0.0.0.0", "-p", "80"]
