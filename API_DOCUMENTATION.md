# 📖 Dokumentasi API - Recognition Backend System

Dokumentasi resmi seluruh *endpoint* Backend untuk tim **Frontend (Web Admin)** dan **Mobile (Karyawan)**.

- **Base URL**: `http://localhost:8000/api/v1` (atau URL server staging/produksi)
- **Content-Type**: `application/json` (Kecuali upload foto yang menggunakan `multipart/form-data`)

---

## 🔐 1. Authentication (Otentikasi)

### A. Login Mobile (Karyawan)
*Digunakan oleh aplikasi Mobile Android/iOS untuk login karyawan.*
- **URL**: `/mobile/auth/login`
- **Method**: `POST`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "budi@test.com",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login berhasil",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "employee": {
        "id": "clx...",
        "employeeId": "EMP001",
        "name": "Budi Santoso",
        "email": "budi@test.com",
        "department": "IT Support",
        "position": "Software Engineer"
      }
    }
  }
  ```

### B. Login Web Admin (HR / Supervisor)
*Digunakan oleh Dashboard Web Admin.*
- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@test.com",
    "password": "adminpassword"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login berhasil",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "clx...",
        "email": "admin@test.com",
        "name": "Admin Utama",
        "role": "ADMIN"
      }
    }
  }
  ```

---

## 📱 2. Mobile Endpoints (Aplikasi Karyawan)

> 💡 **Headers Wajib**: `Authorization: Bearer <TOKEN_JWT_MOBILE>`

### A. Profil Karyawan
- **URL**: `/mobile/profile`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Profil berhasil diambil",
    "data": {
      "id": "clx...",
      "employeeId": "EMP001",
      "name": "Budi Santoso",
      "email": "budi@test.com",
      "department": "IT Support",
      "position": "Software Engineer",
      "faceRegistered": true,
      "photos": ["https://..."]
    }
  }
  ```

### B. Jadwal Hari Ini
- **URL**: `/mobile/schedule/today`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Jadwal hari ini berhasil diambil",
    "data": {
      "id": "cmsfuywhq0000trhcnldc5ec1",
      "scheduleCode": "REG-01",
      "name": "Reguler Pagi",
      "workDays": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      "checkInTime": "08:00",
      "checkOutTime": "17:00",
      "breakStartTime": "12:00",
      "breakEndTime": "13:00",
      "toleranceMinutes": 15
    }
  }
  ```

### C. Riwayat Absensi Karyawan
- **URL**: `/mobile/attendance/history?page=1&limit=10`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Riwayat absensi berhasil diambil",
    "data": [
      {
        "id": "cmsh...",
        "eventType": "CHECK_IN",
        "status": "CHECKED_IN",
        "timestamp": "2026-08-06T08:10:00.000Z",
        "isLate": false
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
  ```

### D. Daftar Notifikasi Karyawan
- **URL**: `/mobile/notifications?page=1&limit=10`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar notifikasi berhasil diambil",
    "data": [
      {
        "id": "cmsh06wp40002ifgyma1xfq2y",
        "type": "WARNING",
        "title": "Peringatan Keterlambatan",
        "description": "Anda tercatat keterlambatan pada absensi CHECK_IN",
        "isRead": false,
        "createdAt": "2026-08-06T04:16:02.825Z",
        "attendance": {
          "eventType": "CHECK_IN",
          "timestamp": "2026-08-06T04:16:02.793Z",
          "isLate": true
        }
      }
    ]
  }
  ```

### E. Tandai Notifikasi Dibaca
- **URL**: `/mobile/notifications/:id/read`
- **Method**: `PATCH`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Notifikasi berhasil ditandai telah dibaca",
    "data": { "id": "cmsh...", "isRead": true }
  }
  ```

### F. Update Device FCM Token (Push Notification)
- **URL**: `/mobile/device-token`
- **Method**: `PATCH`
- **Request Body**:
  ```json
  {
    "fcmToken": "fcm_device_token_string_here"
  }
  ```

---

## 📹 3. AI / CCTV Face Recognition Ingestion

> 💡 **Headers Wajib**: `x-api-key: your-ml-api-key-change-in-production`

### Kirim Event Absensi dari AI/CCTV
- **URL**: `/attendance`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "employee_id": "EMP001",
    "camera_id": "cctv-pintu-depan",
    "event_type": "CHECK_IN",
    "detected_at": "2026-08-06T08:05:00Z",
    "similarity": 0.95
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "OK",
    "data": null
  }
  ```

---

## 💻 4. Web Admin Dashboard Endpoints

> 💡 **Headers Wajib**: `Authorization: Bearer <TOKEN_JWT_ADMIN>`

### A. Dashboard Overview & Statistics
- **URL**: `/dashboard`
- **Method**: `GET`

### B. List Absensi Karyawan
- **URL**: `/attendance?page=1&limit=20&start_date=2026-08-01T00:00:00Z&end_date=2026-08-31T23:59:59Z`
- **Method**: `GET`

### C. Ringkasan Kehadiran Harian
- **URL**: `/attendance/daily?date=2026-08-06`
- **Method**: `GET`

### D. Update Status Konfirmasi Absensi
- **URL**: `/attendance/:id/status`
- **Method**: `PATCH`
- **Request Body**: `{"status": "CONFIRMED"}` (pilihan: `PENDING`, `CONFIRMED`, `REJECTED`)

### E. CRUD Management (Employees, Cameras, Schedules)
- `GET/POST/PATCH/DELETE /employees`
- `GET/POST/PATCH/DELETE /cameras`
- `GET/POST/PATCH/DELETE /schedules`
