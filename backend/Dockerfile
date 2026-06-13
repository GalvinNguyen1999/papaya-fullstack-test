# Backend (NestJS + Prisma) — single container for Render.
FROM node:20-slim

# Prisma needs openssl at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000
# On start: create/sync tables, seed once (idempotent), then run the API.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run seed && node dist/main.js"]
