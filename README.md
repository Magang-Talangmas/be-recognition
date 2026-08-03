# Automatic Attendance System - Backend API

Backend API berbasis Node.js, Express, TypeScript, Prisma (PostgreSQL), dan Redis yang berfungsi untuk mengelola data presensi/absensi otomatis menggunakan pengenalan wajah (*Face Recognition*).

---

## 🛠 Tech Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database (ORM)**: PostgreSQL & Prisma ORM
- **In-Memory Cache (Debounce)**: Redis
- **Authentication**: JWT (Web Client) & API Key (`x-api-key` untuk ML Server)
- **Validation**: Zod
- **Testing**: Jest & `ts-jest`

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat
- Node.js & npm
- Docker & Docker Compose

### 2. Clone Repositori & Install Dependencies
```bash
git clone https://github.com/Magang-Talangmas/be-recognition.git
cd be-recognition
npm install
```

### 3. Konfigurasi Environment Variable
Salin `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Sesuaikan isi `.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://attendance_user:password123@localhost:5432/attendance_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-jwt-key-min-32-chars
ML_API_KEY=your-ml-api-key-change-in-production
```

### 4. Jalankan Database & Redis (Docker)
```bash
docker compose up -d
```

### 5. Jalankan Migrasi Database & Seeding Data
```bash
# Jalankan migrasi database
npx prisma migrate dev --name init

# Seed data awal (Admin & Contoh Karyawan)
npx ts-node --transpile-only prisma/seed.ts
```

> **Data Default Seeding:**
> - **Admin**: Email `admin@test.com`, Password `admin123`
> - **Employee**: Employee ID `EMP001` (Budi Santoso)

### 6. Jalankan Server Dev
```bash
npm run dev
```
Server akan berjalan di `http://localhost:3000`.

---

## 📑 Dokumentasi API untuk Frontend & ML

Semua endpoint berawalan dengan prefix `/api/v1`.

### 1. Health Check
- `GET /api/v1/health`
- **Response**: `200 OK`

### 2. Autentikasi (Frontend Web)
- `POST /api/v1/auth/login`
- **Body**:
  ```json
  {
    "email": "admin@test.com",
    "password": "admin123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGci...",
      "user": {
        "id": "...",
        "email": "admin@test.com",
        "name": "Admin Test",
        "role": "ADMIN"
      }
    }
  }
  ```

### 3. Presensi Otomatis (ML Server / Camera)
- `POST /api/v1/attendance`
- **Header**: `x-api-key: <ML_API_KEY>`
- **Body**:
  ```json
  {
    "employee_id": "EMP001",
    "camera_id": "CAM01",
    "timestamp": "2026-08-03T08:00:00.000Z"
  }
  ```
- **Response**: `200 OK`
- **Catatan**: Endpoint ini memiliki mekanisme **Redis Debounce (15 Menit)** untuk mencegah duplikasi absensi dari kamera.

### 4. Kelola Karyawan (Frontend Web)
> Perlu Header: `Authorization: Bearer <JWT_TOKEN>`

- `GET /api/v1/employees` — Ambil daftar karyawan (paginated)
- `POST /api/v1/employees` — Tambah karyawan baru (`ADMIN` only)
- `GET /api/v1/employees/:id` — Detail karyawan
- `PATCH /api/v1/employees/:id` — Update karyawan (`ADMIN` only)
- `DELETE /api/v1/employees/:id` — Hapus karyawan (Soft Delete, `ADMIN` only)

### 5. Laporan Presensi (Frontend Web)
> Perlu Header: `Authorization: Bearer <JWT_TOKEN>`

- `GET /api/v1/attendance?page=1&limit=10&employee_id=EMP001&start_date=2026-08-01T00:00:00Z&end_date=2026-08-31T23:59:59Z`
- `GET /api/v1/attendance/:id` — Detail presensi

---

## 🧪 Testing

Jalankan pengujian unit (Unit Test):
```bash
# Jalankan test dengan coverage
npm test

# Watch mode
npm run test:watch
```

---

## 📦 Skema Database (Prisma)

- **User**: Pengguna web admin/user (`id`, `email`, `password`, `name`, `role`)
- **Employee**: Data karyawan (`id`, `employeeId`, `name`, `department`, `position`, `isActive`)
- **Attendance**: Log presensi (`id`, `employeeId`, `cameraId`, `timestamp`)
