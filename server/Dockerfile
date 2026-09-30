# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Prisma's engine needs OpenSSL to detect the correct binary target
RUN apk add --no-cache openssl

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source and generate Prisma client
COPY . .
RUN npx prisma generate

# ── Production stage ─────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Prisma's engine needs OpenSSL at runtime too
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]
