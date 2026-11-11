# ☕ BrewLite - Cashless Coffee Ordering System

> **Học phần:** Công nghệ Phần mềm (Software Engineering)  
> **Học kỳ:** I — Năm học 2026-2027  
> **Đơn vị:** Khoa Công nghệ Thông tin — Trường Đại học Sài Gòn (SGU)  
> **Phiên bản:** Version 1.0 (Bàn giao sản phẩm MVP - Assignment 1)  
> **Mô hình quy trình:** Agile Scrum (3 Sprints — 10 Product Backlog Tasks)

---
## 🎯 1. Tổng Quan Dự Án & Product Vision

### 1.1. Product Vision (Tầm nhìn sản phẩm)
> *"BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thiểu thời gian xếp hàng và nhận đơn nhanh chóng tại quầy."*

### 1.2. Các bên liên quan (Stakeholders)
* **Khách hàng (Customer):** Xem menu đồ uống, tùy biến kích cỡ (size)/topping, đưa vào giỏ hàng, thực hiện thanh toán không tiền mặt và theo dõi lịch sử đơn hàng.
* **Nhân viên quầy/Barista:** Tiếp nhận đơn hàng và cập nhật tiến trình pha chế (mở rộng theo sơ đồ chuyển trạng thái).
* **Product Owner / Quản lý:** Quản lý danh mục, thiết lập mã ưu đãi, kiểm soát dòng tiền và trạng thái đơn hàng.
* **Giảng viên hướng dẫn & Nghiệm thu:** Đánh giá tính chuẩn mực của quy trình Agile Scrum, độ bền vững của mã nguồn và độ hoàn thiện của bài toán bàn giao.

### 1.3. Luồng nghiệp vụ cốt lõi (Happy Path)
```
[Khách Mở Ứng Dụng]
        ↓
  [Xem Thực Đơn] ──(Tùy chọn: Size S/M/L, Toppings)
        ↓
[Thêm Vào Giỏ Hàng] ──(Tự động tính tổng tiền & lưu trữ Zustand)
        ↓
 [Đăng Nhập Tài Khoản] ──(Xác thực Token JWT bảo mật)
        ↓
[Thanh Toán Không Tiền Mặt] ──(Cổng Mock Payment: Thẻ / Ví điện tử)
        ↓
[Xác Nhận & Nhận Mã Đơn] ──(Trạng thái PAID ──▶ Barista chế biến)
```

---

## 🏗️ 2. Kiến Trúc Hệ Thống & Công Nghệ Sử Dụng (Tech Stack)

Hệ thống được thiết kế theo mô hình kiến trúc phân tầng độc lập (Clean Architecture), tách bạch rõ ràng giữa tầng hiển thị và tầng dịch vụ nghiệp vụ:

```
BrewLite/
├── frontend/               # Ứng dụng Next.js (Web UI Client-Side & SSR)
├── backend/                # Dịch vụ NestJS REST API & Business Engines
├── docker-compose.yml      # Cấu hình container hóa toàn bộ hệ thống
├── .dockerignore           # Tối ưu hóa dung lượng build Docker context
└── README.md               # Tài liệu báo cáo bàn giao kỹ thuật
```

| Tầng kiến trúc | Công nghệ triển khai | Vai trò & Mục đích sử dụng |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (React 18, TypeScript)** | Xây dựng giao diện Web App Mobile-first, TailwindCSS, State Management bằng **Zustand** |
| **Backend** | **NestJS (TypeScript)** | Kiến trúc Module/Controller/Service, xác thực dữ liệu DTO (`class-validator`), bảo mật JWT (`Passport`) |
| **Cơ sở dữ liệu** | **PostgreSQL 16** | Hệ quản trị cơ sở dữ liệu quan hệ, đảm bảo chuẩn ACID và tính toàn vẹn dữ liệu giao dịch |
| **ORM** | **Prisma ORM 5.22.0** | Quản trị schema, migration tự động hóa, cung cấp Type-safe queries và công cụ Seeding |
| **DevOps / Triển khai** | **Docker & Docker Compose** | Đóng gói toàn bộ ngăn xếp dịch vụ (Database, Backend, Frontend) chạy đồng nhất chỉ với một lệnh |
| **Kiểm thử tự động** | **Jest & Supertest** | Kiểm thử đơn vị (Unit Test) và kiểm thử nghiệp vụ biên (State Machine, Concurrency, Idempotency) |

---

## 📋 3. Bảng Nghiệm Thu 10 Task Product Backlog (10/10 Điểm)

Dự án được tổ chức phát triển nghiêm ngặt qua 3 Sprint với 10 Task hoàn chỉnh, thỏa mãn đầy đủ các tiêu chí chấp nhận (Acceptance Criteria):

| Mã Task | Sprint | Tên Task (User Story) | Tiêu chí chấp nhận & Minh chứng hoàn thành | Trạng thái | Điểm |
| :---: | :---: | :--- | :--- | :---: | :---: |
| **Task 1** | **Sprint 1** | Khởi tạo cấu trúc dự án | Tổ chức 2 thư mục độc lập `frontend` + `backend`, Git repo chuẩn Conventional Commits, khởi chạy thành công môi trường dev và container hóa. | **DONE** | **1.0** |
| **Task 2** | **Sprint 1** | API Danh mục & Món đồ uống | Các endpoint `GET /products` và `GET /products/:id` trả về JSON danh sách món, phân loại, giá bán và hình ảnh từ cơ sở dữ liệu. | **DONE** | **1.0** |
| **Task 3** | **Sprint 1** | Giao diện Menu (Frontend) | Next.js fetch dữ liệu từ API `/products`, render danh sách món dạng lưới responsive, hỗ trợ Skeleton Loading khi tải và Empty State khi hết món. | **DONE** | **1.0** |
| **Task 4** | **Sprint 1** | Chi tiết & Tùy chọn món | Modal chi tiết sản phẩm: cho phép chọn Size (S/M/L) và danh sách Topping đi kèm; giá tiền hiển thị cập nhật linh hoạt theo thời gian thực. | **DONE** | **1.0** |
| **Task 5** | **Sprint 2** | Quản lý Giỏ hàng (Cart State) | Quản lý state toàn cục bằng Zustand: Thêm, tăng/giảm số lượng, xóa món khỏi giỏ; tự động tính tổng tiền; hiển thị badge số lượng món tức thì. | **DONE** | **1.0** |
| **Task 6** | **Sprint 2** | API Khởi tạo đơn hàng | Endpoint `POST /orders` nhận dữ liệu giỏ hàng, xác thực chặt chẽ bằng DTO (`class-validator`), lưu đơn mới vào CSDL với trạng thái khởi tạo `PENDING`. | **DONE** | **1.0** |
| **Task 7** | **Sprint 2** | Đăng ký & Đăng nhập (JWT) | Endpoints `POST /auth/register`, `POST /auth/login`: Mật khẩu được mã hóa băm bằng `bcrypt`, cấp phát Token JWT; kích hoạt `JwtAuthGuard` bảo vệ các route đơn hàng. | **DONE** | **1.0** |
| **Task 8** | **Sprint 3** | Thanh toán không tiền mặt | Cổng thanh toán giả lập (Mock Payment Gateway): Hỗ trợ Ví điện tử/Thẻ, gọi `POST /payments`. Thành công cập nhật `PAID`, thất bại ghi nhận `PAYMENT_FAILED`. | **DONE** | **1.0** |
| **Task 9** | **Sprint 3** | Màn hình xác nhận & Bàn giao | Màn hình thông báo mã đơn sau thanh toán; trang `GET /orders/me` tra cứu lịch sử đơn; hoàn thiện tệp `docker-compose.yml` triển khai trọn gói. | **DONE** | **1.0** |
| **Task 10** | **Sprint 3** | Nghiệp vụ Backend nâng cao | Hiện thực trọn vẹn 4 nghiệp vụ lõi: Máy trạng thái đơn hàng, Thanh toán Idempotent, Kiểm soát tồn kho đồng thời (Concurrency) và Điểm tích lũy Loyalty. | **DONE** | **1.0** |

---

## ⚙️ 4. Chi Tiết Kỹ Thuật Nghiệp Vụ Trọng Tâm (Task 10)

### 4.1. Order State Machine (Máy trạng thái đơn hàng)
Hệ thống sử dụng cơ chế kiểm soát chuyển trạng thái nghiêm ngặt (`assertTransition`) tại `OrdersService`. Mọi yêu cầu cập nhật trạng thái không tuân thủ đồ thị cho phép sẽ bị chặn đứng ngay lập tức và trả về mã lỗi `400 Bad Request`.

```
                  ┌───────────────┐
      ┌───────────│    PENDING    │───────────────┐
      │           └───────┬───────┘               │
      │ (Thanh toán lỗi)   │ (Thanh toán OK)       │ (Khách hủy)
      ▼                   ▼                       ▼
┌──────────────┐  ┌───────────────┐       ┌───────────────┐
│PAYMENT_FAILED│  │     PAID      │──────▶│   CANCELLED   │
└──────┬───────┘  └───────┬───────┘ (Hủy) └───────────────┘
       │ (Thử lại)        │ (Barista nhận)
       └──────────────────┤
                          ▼
                  ┌───────────────┐
                  │   PREPARING   │
                  └───────┬───────┘
                          │ (Pha chế xong)
                          ▼
                  ┌───────────────┐
                  │     READY     │
                  └───────┬───────┘
                          │ (Giao nước cho khách)
                          ▼
                  ┌───────────────┐
                  │   COMPLETED   │ (Trạng thái kết thúc)
                  └───────────────┘
```

* **Luồng chuẩn (Happy Path):** $\text{PENDING} \longrightarrow \text{PAID} \longrightarrow \text{PREPARING} \longrightarrow \text{READY} \longrightarrow \text{COMPLETED}$.
* **Chặn chuyển đổi bất hợp lệ:** Chặn đứng các hành động nhảy cóc (như $\text{PENDING} \longrightarrow \text{COMPLETED}$ hoặc từ trạng thái kết thúc quay ngược về ban đầu).

### 4.2. Thanh toán Idempotent (Chống trừ tiền trùng lặp)
* Client gửi kèm khóa duy nhất qua header `Idempotency-Key` (UUIDv4) trong mỗi yêu cầu thanh toán.
* Backend kiểm tra khóa đối soát trong bảng `Payment`:
    * Nếu phát hiện khóa đã từng xử lý thành công trước đó, hệ thống trả về kết quả cũ ngay lập tức mà **không thực hiện lại giao dịch trừ tiền** hay tạo đơn hàng mới.
    * Đảm bảo an toàn tuyệt đối khi mạng chập chờn khiến người dùng nhấn nút thanh toán nhiều lần.

### 4.3. Kiểm soát tồn kho khi đặt đồng thời (Concurrency Control)
* Khi nhiều khách hàng cùng bấm đặt mua một mặt hàng số lượng có hạn tại cùng một thời điểm mili-giây, hệ thống kích hoạt **Prisma Interactive Transaction** kết hợp kiểm tra điều kiện tồn kho thực tế:
  $$\text{stock}_{\text{hiện tại}} \ge \text{quantity}_{\text{đặt mua}}$$
* Nếu tồn kho không đủ đáp ứng, giao dịch lập tức bị Rollback hoàn toàn và thông báo lỗi hết hàng cho các lượt đặt sau, triệt tiêu nguy cơ bán âm kho (**Over-selling**).

### 4.4. Khuyến mãi & Tích lũy điểm thưởng (Loyalty Program)
* Hỗ trợ áp dụng mã giảm giá hợp lệ (kiểm tra hạn dùng, số lượng cho phép, mức chiết khấu).
* Ngay khi đơn hàng hoàn tất thanh toán và chuyển sang trạng thái `PAID`, hệ thống tự động tính toán và cộng dồn điểm tích lũy (`loyaltyPoints`) vào tài khoản khách hàng để sử dụng cho các lần mua tiếp theo.

---

## 🧪 5. Kiểm Thử Hệ Thống (Automated Testing)

Toàn bộ các tiêu chí chấm điểm kỹ thuật của **Task 10** được kiểm chứng thông qua bộ kịch bản kiểm thử tự động (Integration/Unit Tests):

```powershell
# Chạy toàn bộ các kịch bản kiểm thử nghiệp vụ nâng cao từ thư mục backend
npm run test:robustness
```

### Minh chứng các kịch bản kiểm thử đạt chuẩn:
1. **(a) Chặn chuyển trạng thái sai (`orders-state-machine`):**
    * Giả lập cập nhật trạng thái đơn từ `PENDING` trực tiếp sang `COMPLETED`. Kết quả: Hệ thống ném ngoại lệ `BadRequestException`, đơn hàng giữ nguyên trạng thái.
2. **(b) Idempotency-Key chống tạo trùng (`payments-idempotency`):**
    * Giả lập gửi liên tiếp 2 HTTP request thanh toán có chung một giá trị `Idempotency-Key`. Kết quả: Chỉ có duy nhất 1 giao dịch được tạo trong CSDL, cả 2 request đều nhận mã `200/201 OK` với cùng dữ liệu phản hồi.
3. **(c) Đặt hàng đồng thời không vượt tồn kho (`orders-concurrency`):**
    * Giả lập sản phẩm chỉ còn tồn kho 2 sản phẩm, dùng `Promise.all()` gửi đồng loạt 10 lượt đặt mua cùng thời điểm. Kết quả: Đúng 2 đơn hàng đặt thành công, 8 lượt yêu cầu còn lại bị từ chối an toàn với thông báo hết hàng.

---

## 🚀 6. Hướng Dẫn Cài Đặt & Khởi Chạy (Deployment Guide)

Hệ thống được đóng gói hoàn chỉnh bằng Docker Compose, sẵn sàng vận hành trên bất kỳ môi trường nào mà không cần cài đặt thủ công các dịch vụ phụ trợ.

### 6.1. Bảng cổng mạng phân bổ độc lập

| Dịch vụ (Service) | Cổng bên ngoài (Host Machine) | Cổng container nội bộ | Mục đích truy cập |
| :--- | :---: | :---: | :--- |
| **Frontend Web** | **3000** | 3000 | Giao diện người dùng Next.js |
| **Backend API** | **3001** | 3001 | RESTful API Service NestJS |
| **PostgreSQL Database** | **5432** | 5432 | Cơ sở dữ liệu quan hệ PostgreSQL |

### 6.2. Hướng dẫn khởi chạy nhanh một chạm (One-Command Start)

**Bước 1: Tải mã nguồn dự án**
```powershell
git clone https://github.com/sotsoatchamcom/Brewlite.git
cd Brewlite
```

**Bước 2: Xây dựng và khởi chạy các container ngầm**
```powershell
docker compose up -d --build
```
> *Lưu ý: Đảm bảo cả 3 container `brewlite-frontend`, `brewlite-backend`, và `brewlite-postgres` đều đạt trạng thái `Up` khi kiểm tra bằng lệnh `docker ps`.*

**Bước 3: Đồng bộ bảng cơ sở dữ liệu và nạp dữ liệu mẫu (Seeding)**
```powershell
# Đẩy trực tiếp schema vào database PostgreSQL
docker compose exec backend npx prisma db push

# Nạp dữ liệu menu đồ uống, topping và các tài khoản demo
docker compose exec backend npx prisma db seed
```

**Bước 4: Truy cập hệ thống**
* **Trang chủ & Đặt hàng (Frontend):** [http://localhost:3000](http://localhost:3000)
* **Tài liệu Swagger API (Backend):** [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
* **Kiểm tra trạng thái máy chủ (Health Check):** [http://localhost:3001/api/docs/health](http://localhost:3001/api/docs/health)

---

## 🔑 7. Tài Khoản Kiểm Thử Mẫu (Demo Credentials)

Sau khi chạy lệnh nạp dữ liệu mẫu (`prisma db seed`), hệ thống cung cấp sẵn các tài khoản sau để phục vụ việc chấm điểm và nghiệm thu:

| Phân quyền tài khoản | Email đăng nhập | Mật khẩu mặc định | Mục đích kiểm thử chức năng |
| :--- | :--- | :---: | :--- |
| **Khách hàng (Customer)** | `customer@brewlite.com` | `Customer@2026!` | Đặt món từ menu, chọn topping, thanh toán ví điện tử mock, xem lịch sử đơn hàng cá nhân |
| **Quản trị viên (Admin)** | `admin@brewlite.com` | `Admin@2026` | Quản lý danh mục, xem toàn bộ danh sách đơn đặt, chuyển trạng thái chế biến đồ uống |

---

## 📡 8. Danh Sách Endpoint API Chính

Hệ thống cung cấp đầy đủ các chuẩn API RESTful theo đặc tả yêu cầu của đề tài:

| Phương thức | Endpoint | Mô tả chức năng | Quyền truy cập |
| :---: | :--- | :--- | :---: |
| `POST` | `/auth/register` | Đăng ký tài khoản khách hàng mới | Public |
| `POST` | `/auth/login` | Xác thực đăng nhập, trả về Access Token JWT | Public |
| `GET` | `/products` | Lấy danh sách toàn bộ đồ uống đang kinh doanh | Public |
| `GET` | `/products/:id` | Xem thông tin chi tiết của một sản phẩm | Public |
| `POST` | `/orders` | Khởi tạo đơn hàng mới (trạng thái `PENDING`) | Yêu cầu JWT |
| `POST` | `/payments` | Thực hiện thanh toán không tiền mặt (Idempotent) | Yêu cầu JWT |
| `GET` | `/orders/me` | Lấy lịch sử tất cả các đơn hàng của người dùng hiện tại | Yêu cầu JWT |
| `GET` | `/health` | Kiểm tra trạng thái kết nối CSDL và máy chủ API | Public |

---

## 📊 9. Sprint Retrospective (Đánh Giá Quá Trình Thực Hiện)

* **Điểm làm tốt (What went well):**
    * Hoàn thành đúng tiến độ cả 10 Task Backlog theo kế hoạch 3 Sprint của quy trình Agile Scrum.
    * Hiện thực và bao phủ kiểm thử tự động toàn diện cho các nghiệp vụ khó ở Task 10 (State Machine, Idempotency, Concurrency).
    * Chuẩn hóa Docker Compose giúp việc chạy demo nghiệm thu diễn ra trơn tru, không phụ thuộc vào cấu hình máy chấm thi.
* **Thách thức và Giải pháp (Challenges & Solutions):**
    * *Xung đột môi trường:* Gặp vấn đề xung đột cú pháp khi chuyển đổi giữa các hệ quản trị CSDL; giải quyết dứt điểm bằng cách cô lập Docker Volume và sử dụng cơ chế `prisma db push`.
    * *Tối ưu hóa Build:* Biến môi trường Next.js yêu cầu nạp lúc build; giải quyết bằng cách thiết lập linh hoạt các tham số cổng và proxy network trong Docker.