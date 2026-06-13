FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci

COPY . .

RUN npm run build -w @whatsnext/shared \
  && npm run generate -w @whatsnext/database \
  && npm run build -w @whatsnext/database \
  && npm run build -w @whatsnext/api

ENV NODE_ENV=production

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/main.js"]
