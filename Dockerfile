FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder /app/public ./public
# Standalone-Build enthält eigene node_modules (deutlich kleiner)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p public/uploads/generated public/uploads/events && \
    chown -R nodejs:nodejs public/uploads

USER nodejs

EXPOSE 8080
# exec node statt npm start – SIGTERM wird korrekt an den Node-Prozess weitergeleitet
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]