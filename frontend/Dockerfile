FROM node:20-alpine
WORKDIR /app

# Cài đặt libc6-compat cho SWC compiler của Next.js
RUN apk add --no-cache libc6-compat

# Cài đặt dependencies với legacy-peer-deps
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Sao chép toàn bộ mã nguồn
COPY . .

# Khai báo biến môi trường cho quá trình build Next.js
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build ứng dụng Next.js
RUN npm run build

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "run", "start"]