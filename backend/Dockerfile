# Stage 1: Build ứng dụng
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .
RUN mkdir -p /app/uploads
RUN npx prisma generate
RUN npm run build

# Stage 2: Môi trường chạy Production
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm install --omit=dev

# Đảm bảo có thư mục uploads
RUN mkdir -p /app/uploads
COPY --from=builder /app/uploads ./uploads

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main; else node dist/src/main; fi"]