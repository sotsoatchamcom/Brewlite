Hướng dẫn khởi tạo Database:   
Cách 1: Chạy file SQL trực tiếp (qua Navicat / MySQL Workbench / CLI)

Mở công cụ quản trị CSDL kết nối đến MySQL nội bộ.

Mở và thực thi toàn bộ nội dung file database/init.sql.

Cách 2: Đồng bộ tự động qua Prisma CLI (Khuyên dùng)

Cấu hình biến môi trường trong backend/.env:

DATABASE_URL="mysql://root:@localhost:3306/brewlite"
Chạy lệnh đồng bộ schema và nạp dữ liệu mẫu (seed):

Bash
cd backend
npx prisma db push
npx prisma db seed


### Bước 1: Clone dự án
```bash
git clone <URL_REPOSITORY_CỦA_NHÓM>
cd BrewLite
```

### Bước 2: Thiết lập Backend (NestJS)
1. Di chuyển vào thư mục backend và cài đặt thư viện:
   ```bash
   cd backend
   npm install
   ```
2. Tạo file `.env` từ file mẫu:
   ```env
   PORT=3001
   DATABASE_URL="mysql://root:matkhau@localhost:3306/brewlite"
   JWT_SECRET="brewlite_jwt_secret_key_2026"
   ```
3. Đồng bộ Database & Nạp dữ liệu mẫu (Seed):
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. Khởi chạy Backend:
   ```bash
   npm run start:dev
   ```
    - API Server: `http://localhost:3001`
    - Tài liệu Swagger UI: `http://localhost:3001/api`

### Bước 3: Thiết lập Frontend (Next.js)
1. Mở một tab Terminal mới, di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   npm install
   ```
2. Tạo file `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```
3. Khởi chạy Frontend:
   ```bash
   npm run dev
   ```
    - Giao diện Admin/Client: `http://localhost:3000`