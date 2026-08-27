export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Automatic Attendance & Recognition API',
    version: '1.0.0',
    description: 'Dokumentasi resmi seluruh API Backend untuk tim Frontend (Web Admin), Mobile (Karyawan), dan ML/CCTV.',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'V1 API Server Base Path',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan JWT token di sini. (Contoh: `Authorization: Bearer <token>`)',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API Key untuk autentikasi sistem ML/CCTV. (Contoh: `x-api-key: <key>`)',
      },
    },
    schemas: {
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmsim943c0001cyyy92u0sxxk' },
          employeeId: { type: 'string', example: 'EMP001' },
          name: { type: 'string', example: 'Budi Santoso' },
          email: { type: 'string', example: 'budi@gmail.com' },
          department: { type: 'string', example: 'Engineering' },
          position: { type: 'string', example: 'Developer' },
          faceRegistered: { type: 'boolean', example: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Attendance: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmsh06wp40002ifgyma1xfq2y' },
          employeeId: { type: 'string', example: 'EMP001' },
          cameraId: { type: 'string', example: 'cctv-pintu-depan' },
          eventType: { type: 'string', enum: ['CHECK_IN', 'CHECK_OUT'], example: 'CHECK_IN' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'REJECTED'], example: 'CONFIRMED' },
          timestamp: { type: 'string', format: 'date-time', example: '2026-08-06T08:10:00.000Z' },
          isLate: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Cctv: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmsk06wp40002ifgyma1xfq3x' },
          cameraId: { type: 'string', example: 'cctv-lobby' },
          name: { type: 'string', example: 'CCTV Lobby Utama' },
          rtspUrl: { type: 'string', example: 'rtsp://192.168.1.100:554/stream1' },
          isEnabled: { type: 'boolean', example: true },
          isOnline: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Schedule: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmsfuywhq0000trhcnldc5ec1' },
          scheduleCode: { type: 'string', example: 'REG-01' },
          name: { type: 'string', example: 'Reguler Pagi' },
          workDays: {
            type: 'array',
            items: { type: 'string' },
            example: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
          },
          checkInTime: { type: 'string', example: '08:00' },
          checkOutTime: { type: 'string', example: '17:00' },
          breakStartTime: { type: 'string', example: '12:00' },
          breakEndTime: { type: 'string', example: '13:00' },
          toleranceMinutes: { type: 'integer', example: 15 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmsz06wp40002ifgyma1xfq4z' },
          employeeId: { type: 'string', example: 'EMP001' },
          date: { type: 'string', format: 'date', example: '2026-08-06' },
          type: { type: 'string', enum: ['SICK', 'LEAVE', 'PERMIT'], example: 'SICK' },
          reason: { type: 'string', example: 'Sakit demam tinggi, butuh istirahat' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], example: 'PENDING' },
          photo: { type: 'string', example: 'uploads/permissions/letter-abc.jpg', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Settings: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'default' },
          organizationName: { type: 'string', example: 'PT Solusi Teknologi' },
          lateTolerance: { type: 'integer', example: 15 },
          reminderInterval: { type: 'integer', example: 30 },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cmsh06wp40002ifgyma1xfq2y' },
          type: { type: 'string', enum: ['WARNING', 'INFO', 'SYSTEM'], example: 'WARNING' },
          title: { type: 'string', example: 'Peringatan Keterlambatan' },
          description: { type: 'string', example: 'Anda tercatat terlambat pada absensi CHECK_IN' },
          isRead: { type: 'boolean', example: false },
          employeeId: { type: 'string', example: 'cmsim943c0001cyyy92u0sxxk', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Web Auth'],
        summary: 'Login Web Admin (HR / Supervisor)',
        description: 'Mendapatkan JWT Token untuk mengakses endpoint Web Admin Dashboard.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@test.com' },
                  password: { type: 'string', example: 'adminpassword' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login berhasil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login berhasil' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'clx...' },
                            email: { type: 'string', example: 'admin@test.com' },
                            name: { type: 'string', example: 'Admin Utama' },
                            role: { type: 'string', example: 'ADMIN' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/auth/login': {
      post: {
        tags: ['Mobile Auth'],
        summary: 'Login Mobile Karyawan',
        description: 'Mendapatkan JWT Token untuk mengakses seluruh endpoint aplikasi Mobile Karyawan.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'budi@test.com' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login berhasil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login berhasil' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        employee: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'cmsim943c0001cyyy92u0sxxk' },
                            employeeId: { type: 'string', example: 'EMP001' },
                            name: { type: 'string', example: 'Budi Santoso' },
                            email: { type: 'string', example: 'budi@test.com' },
                            department: { type: 'string', example: 'Engineering' },
                            position: { type: 'string', example: 'Developer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/profile': {
      get: {
        tags: ['Mobile Karyawan'],
        summary: 'Mendapatkan Profil Karyawan',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Detail profil berhasil diambil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profil berhasil diambil' },
                    data: { $ref: '#/components/schemas/Employee' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/change-password': {
      post: {
        tags: ['Mobile Karyawan'],
        summary: 'Ubah Password Karyawan',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', example: 'akmal123' },
                  newPassword: { type: 'string', example: 'newpassword123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password berhasil diubah',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Password berhasil diubah' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/attendance': {
      post: {
        tags: ['Mobile Karyawan'],
        summary: 'Melakukan Absensi (Face Scan / Foto Selfie)',
        description: 'Mengirimkan foto selfie absensi via multipart form-data.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['photo'],
                properties: {
                  photo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Foto selfie absensi (jpeg/png, max 10MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Absensi berhasil dicatat',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Absensi mandiri berhasil' },
                    data: { $ref: '#/components/schemas/Attendance' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/recognitions/pending': {
      get: {
        tags: ['Mobile Karyawan'],
        summary: 'Daftar Pending CCTV Recognition',
        description: 'Mengambil daftar pengenalan CCTV yang statusnya masih PENDING dan memerlukan konfirmasi dari user.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Daftar penandaan berhasil diambil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Daftar deteksi pending berhasil diambil' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Attendance' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/recognition/{id}/confirm': {
      post: {
        tags: ['Mobile Karyawan'],
        summary: 'Konfirmasi CCTV Recognition ("Ini Saya")',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID dari data attendance/recognition pending',
          },
        ],
        responses: {
          200: {
            description: 'Berhasil dikonfirmasi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Kehadiran berhasil dikonfirmasi' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/recognition/{id}/reject': {
      post: {
        tags: ['Mobile Karyawan'],
        summary: 'Tolak CCTV Recognition ("Bukan Saya")',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID dari data attendance/recognition pending',
          },
        ],
        responses: {
          200: {
            description: 'Berhasil ditolak',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Deteksi berhasil ditolak' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/device-token': {
      patch: {
        tags: ['Mobile Karyawan'],
        summary: 'Update FCM Token',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fcmToken'],
                properties: {
                  fcmToken: { type: 'string', example: 'fcm_device_token_string_here' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Token FCM berhasil diperbarui',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Token perangkat FCM berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/attendance/history': {
      get: {
        tags: ['Mobile Karyawan'],
        summary: 'Daftar Riwayat Kehadiran Karyawan',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
          },
        ],
        responses: {
          200: {
            description: 'Riwayat absensi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Riwayat absensi berhasil diambil' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Attendance' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        total: { type: 'integer', example: 50 },
                        totalPages: { type: 'integer', example: 5 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/schedule/today': {
      get: {
        tags: ['Mobile Karyawan'],
        summary: 'Dapatkan Jadwal Kerja Hari Ini',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Jadwal hari ini',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Jadwal hari ini berhasil diambil' },
                    data: { $ref: '#/components/schemas/Schedule' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/notifications': {
      get: {
        tags: ['Mobile Karyawan'],
        summary: 'Daftar Notifikasi Mobile',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Daftar notifikasi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Daftar notifikasi berhasil diambil' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Notification' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mobile/notifications/{id}/read': {
      patch: {
        tags: ['Mobile Karyawan'],
        summary: 'Tandai Notifikasi Dibaca',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Berhasil diperbarui',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Notifikasi berhasil ditandai telah dibaca' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/attendance': {
      post: {
        tags: ['ML & Ingestion'],
        summary: 'Terima Event Absensi CCTV / ML Engine',
        description: 'Endpoint ingestion untuk mencatat event face recognition dari kamera CCTV (menggunakan x-api-key).',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event_id', 'employee_id', 'camera_id', 'event_type', 'detected_at', 'similarity'],
                properties: {
                  event_id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                  employee_id: { type: 'string', example: 'EMP001' },
                  camera_id: { type: 'string', example: 'cctv-pintu-depan' },
                  event_type: { type: 'string', enum: ['CHECK_IN', 'CHECK_OUT'], example: 'CHECK_IN' },
                  detected_at: { type: 'string', format: 'date-time', example: '2026-08-06T08:05:00Z' },
                  similarity: { type: 'number', example: 0.95 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'OK' },
                    data: { type: 'object', nullable: true, example: null },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ['Web Attendance'],
        summary: 'Daftar Seluruh Kehadiran (Paginated & Filtered)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'ISO 8601 start date' },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'ISO 8601 end date' },
        ],
        responses: {
          200: {
            description: 'Daftar absensi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Attendance' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/attendance/daily': {
      get: {
        tags: ['Web Attendance'],
        summary: 'Kehadiran Karyawan Harian',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, required: true, example: '2026-08-06' },
        ],
        responses: {
          200: {
            description: 'Daftar kehadiran harian',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          employee: { $ref: '#/components/schemas/Employee' },
                          attendance: { $ref: '#/components/schemas/Attendance', nullable: true },
                          status: { type: 'string', example: 'Hadir' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/attendance/{id}': {
      get: {
        tags: ['Web Attendance'],
        summary: 'Detail Kehadiran by ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Detail data absensi karyawan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Berhasil mengambil detail attendance' },
                    data: { $ref: '#/components/schemas/Attendance' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/attendance/{id}/status': {
      patch: {
        tags: ['Web Attendance'],
        summary: 'Update Status Konfirmasi Absensi',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'REJECTED'], example: 'CONFIRMED' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Berhasil di-update',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Status absensi berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/attendance/permissions': {
      post: {
        tags: ['Web & Mobile Permissions'],
        summary: 'Ajukan Izin / Sakit / Cuti',
        description: 'Menerima multipart/form-data untuk mengupload bukti surat keterangan/foto.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['employeeId', 'date', 'type', 'reason'],
                properties: {
                  employeeId: { type: 'string', example: 'EMP001' },
                  date: { type: 'string', format: 'date', example: '2026-08-06' },
                  type: { type: 'string', enum: ['SICK', 'LEAVE', 'PERMIT'], example: 'SICK' },
                  reason: { type: 'string', example: 'Sakit demam' },
                  photo: { type: 'string', format: 'binary', description: 'Surat dokter / bukti izin' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Izin berhasil diajukan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Izin berhasil diajukan' },
                    data: { $ref: '#/components/schemas/Permission' },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        tags: ['Web & Mobile Permissions'],
        summary: 'Daftar Pengajuan Izin',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } },
          { name: 'employeeId', in: 'query', schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Daftar izin',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Permission' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/attendance/permissions/{id}': {
      patch: {
        tags: ['Web & Mobile Permissions'],
        summary: 'Konfirmasi Persetujuan Izin (Admin Only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Status izin berhasil diupdate',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Pengajuan izin dikonfirmasi' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/employees': {
      get: {
        tags: ['Web Employees'],
        summary: 'Daftar Karyawan (Admin/Viewer)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Daftar karyawan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Web Employees'],
        summary: 'Tambah Karyawan Baru (Admin Only)',
        description: 'Menyertakan foto-foto wajah karyawan untuk pendaftaran ke engine AI (max 3 foto, multiparts).',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['employeeId', 'name', 'email', 'department', 'position'],
                properties: {
                  employeeId: { type: 'string', example: 'EMP002' },
                  name: { type: 'string', example: 'Rian Wijaya' },
                  email: { type: 'string', example: 'rian@gmail.com' },
                  department: { type: 'string', example: 'IT' },
                  position: { type: 'string', example: 'QA Engineer' },
                  photos: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Unggah file foto wajah (max 3 file)',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Karyawan berhasil didaftarkan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Karyawan berhasil dibuat' },
                    data: { $ref: '#/components/schemas/Employee' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/employees/{id}': {
      get: {
        tags: ['Web Employees'],
        summary: 'Detail Karyawan',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Detail karyawan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Employee' },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Web Employees'],
        summary: 'Update Data Karyawan (Admin Only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Rian Wijaya Updated' },
                  department: { type: 'string', example: 'Product Development' },
                  photos: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Unggah file foto wajah baru jika ingin mengganti',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Berhasil di-update',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Karyawan berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Web Employees'],
        summary: 'Hapus Karyawan (Soft Delete - Admin Only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Karyawan berhasil dihapus',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Karyawan berhasil dihapus (soft delete)' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/employees/{id}/status': {
      patch: {
        tags: ['Web Employees'],
        summary: 'Toggle Status Karyawan Aktif / Nonaktif',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Status berhasil di-toggle',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Status aktif karyawan berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/employees/{id}/face': {
      patch: {
        tags: ['Web Employees'],
        summary: 'Toggle Verifikasi Wajah Karyawan',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Status verifikasi wajah diperbarui',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Status pendaftaran wajah berhasil diubah' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/employees/sync-ml': {
      post: {
        tags: ['Web Employees'],
        summary: 'Picu Sinkronisasi Manual Wajah ke ML Engine',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Sinkronisasi berhasil dipicu',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Sinkronisasi foto ke ML Engine berhasil' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/employee/{id}': {
      get: {
        tags: ['Web Employees'],
        summary: 'Lookup Karyawan by ID atau Employee ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Dapat berupa UUID Cuid atau custom employeeId (Contoh: EMP001)' },
        ],
        responses: {
          200: {
            description: 'Karyawan ditemukan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Employee' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports': {
      get: {
        tags: ['Web Reports'],
        summary: 'Daftar Laporan Absensi & Deteksi',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'employee', 'recognition', 'unknown'] } },
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: {
            description: 'Data laporan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/dashboard/summary': {
      get: {
        tags: ['Web Dashboard'],
        summary: 'Overview Statistik Card Dashboard',
        description: 'Mendapatkan ringkasan metrik total karyawan, aktif, hadir hari ini, departemen, dsb.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Statistik dashboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Dashboard summary berhasil diambil' },
                    data: {
                      type: 'object',
                      properties: {
                        totalEmployees: { type: 'integer', example: 120 },
                        active: { type: 'integer', example: 115 },
                        inactive: { type: 'integer', example: 5 },
                        faceRegistered: { type: 'integer', example: 100 },
                        faceNotRegistered: { type: 'integer', example: 20 },
                        presentToday: { type: 'integer', example: 98 },
                        departments: { type: 'integer', example: 6 },
                        recentActivity: { type: 'integer', example: 45 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/dashboard/recent-activity': {
      get: {
        tags: ['Web Dashboard'],
        summary: 'Aktivitas Pengenalan Terbaru Dashboard',
        description: 'Mendapatkan daftar 20 log aktivitas deteksi & pengenalan terbaru.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Daftar aktivitas terbaru',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Aktivitas terbaru berhasil diambil' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          employeeName: { type: 'string', example: 'Budi Santoso' },
                          time: { type: 'string', example: '08:15:22' },
                          status: { type: 'string', example: 'Verified' },
                          camera: { type: 'string', example: 'CCTV Lobby' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/cameras/stream': {
      get: {
        tags: ['CCTV Stream & Status'],
        summary: 'Live MJPEG Video Feed dengan Face Boundary Boxes',
        description: 'Endpoint ini mengembalikan data MJPEG stream real-time langsung.',
        responses: {
          200: {
            description: 'MJPEG Stream Content',
            content: {
              'multipart/x-mixed-replace': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },
    '/cameras/snapshot': {
      get: {
        tags: ['CCTV Stream & Status'],
        summary: 'Get Real-Time Frame Snapshot',
        responses: {
          200: {
            description: 'Image JPEG Content',
            content: {
              'image/jpeg': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },
    '/cameras/status': {
      get: {
        tags: ['CCTV Stream & Status'],
        summary: 'Dapatkan Metrik & Status Engine AI Streaming',
        responses: {
          200: {
            description: 'Status AI Streaming',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    fps: { type: 'number', example: 24.5 },
                    activeFeeds: { type: 'integer', example: 3 },
                    detectedFacesCount: { type: 'integer', example: 2 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/video_feed': {
      get: {
        tags: ['CCTV Stream & Status'],
        summary: 'Proxy Real-Time MJPEG Video Feed (Root Alias)',
        description: 'Root alias video streaming feed untuk web viewer dan mobile player.',
        responses: {
          200: {
            description: 'MJPEG Stream Content',
            content: {
              'multipart/x-mixed-replace': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },
    '/cctv': {
      get: {
        tags: ['Web CCTV Management'],
        summary: 'Daftar CCTV / Kamera di Database',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ONLINE', 'OFFLINE'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: {
            description: 'Daftar kamera',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Cctv' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Web CCTV Management'],
        summary: 'Tambah CCTV Baru',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'rtspUrl'],
                properties: {
                  name: { type: 'string', example: 'CCTV Lobby Depan' },
                  rtspUrl: { type: 'string', example: 'rtsp://admin:admin123@192.168.1.100:554/stream1' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Berhasil dibuat',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Kamera CCTV berhasil dibuat' },
                    data: { $ref: '#/components/schemas/Cctv' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/cctv/sync': {
      post: {
        tags: ['Web CCTV Management'],
        summary: 'Sinkronisasi Otomatis Hubungan ML Engine ke Database CCTV',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Sinkronisasi berhasil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Sinkronisasi CCTV berhasil diselesaikan' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/cctv/{id}': {
      get: {
        tags: ['Web CCTV Management'],
        summary: 'Detail CCTV by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Detail CCTV',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Cctv' },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Web CCTV Management'],
        summary: 'Update CCTV by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'CCTV Belakang Ruangan' },
                  rtspUrl: { type: 'string', example: 'rtsp://192.168.1.101:554/h264' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'CCTV diperbarui',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'CCTV berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Web CCTV Management'],
        summary: 'Hapus CCTV (Hard Delete)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'CCTV dihapus',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'CCTV berhasil dihapus' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/cctv/{id}/status': {
      patch: {
        tags: ['Web CCTV Management'],
        summary: 'Toggle Status Online/Offline Kamera',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Status di-toggle',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Status online CCTV berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/cctv/{id}/enabled': {
      patch: {
        tags: ['Web CCTV Management'],
        summary: 'Toggle Aktif/Nonaktif Kamera',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Status di-toggle',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Status fungsional CCTV berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/schedules': {
      get: {
        tags: ['Web Schedules'],
        summary: 'Daftar Seluruh Jadwal Kerja',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Daftar jadwal',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Schedule' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Web Schedules'],
        summary: 'Buat Jadwal Kerja Baru (Admin Only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['scheduleCode', 'name', 'workDays', 'checkInTime', 'checkOutTime'],
                properties: {
                  scheduleCode: { type: 'string', example: 'REG-02' },
                  name: { type: 'string', example: 'Reguler Siang' },
                  workDays: { type: 'array', items: { type: 'string' }, example: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] },
                  checkInTime: { type: 'string', example: '13:00' },
                  checkOutTime: { type: 'string', example: '21:00' },
                  breakStartTime: { type: 'string', example: '17:00' },
                  breakEndTime: { type: 'string', example: '18:00' },
                  toleranceMinutes: { type: 'integer', default: 15 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Jadwal berhasil dibuat',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Jadwal berhasil dibuat' },
                    data: { $ref: '#/components/schemas/Schedule' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/schedules/{id}': {
      get: {
        tags: ['Web Schedules'],
        summary: 'Detail Jadwal Kerja',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Detail jadwal',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Schedule' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Web Schedules'],
        summary: 'Update Jadwal Kerja (Admin Only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Shift Malam' },
                  checkInTime: { type: 'string', example: '22:00' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Berhasil diperbarui',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Jadwal berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Web Schedules'],
        summary: 'Hapus Jadwal Kerja (Admin Only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Jadwal berhasil dihapus',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Jadwal berhasil dihapus' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/feeds': {
      get: {
        tags: ['Live Monitoring'],
        summary: 'Dapatkan Daftar Kamera untuk Feeds Live',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Daftar feed live',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Cctv' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/recognitions': {
      get: {
        tags: ['Live Monitoring'],
        summary: 'Dapatkan Daftar Riwayat Terakhir Deteksi CCTV',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 8 } },
          { name: 'cameraId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Daftar deteksi CCTV',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Attendance' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/notifications': {
      get: {
        tags: ['Live Monitoring'],
        summary: 'Daftar Notifikasi Realtime di Dashboard',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'read', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: {
          200: {
            description: 'Daftar notifikasi dashboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/notifications/read-all': {
      patch: {
        tags: ['Live Monitoring'],
        summary: 'Tandai Semua Notifikasi Dashboard Sudah Dibaca',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Status sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Semua notifikasi ditandai dibaca' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/notifications/{id}/read': {
      patch: {
        tags: ['Live Monitoring'],
        summary: 'Tandai Satu Notifikasi Dashboard Sudah Dibaca',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Status sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Notifikasi ditandai telah dibaca' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/events': {
      get: {
        tags: ['Live Monitoring'],
        summary: 'Real-Time SSE Connection (Server-Sent Events)',
        description: 'Membuka koneksi persist untuk menerima update deteksi wajah realtime. Harus menyertakan token JWT pada parameter token query.',
        parameters: [
          { name: 'token', in: 'query', required: true, schema: { type: 'string' }, description: 'JWT authentication token' },
        ],
        responses: {
          200: {
            description: 'Koneksi SSE berhasil dibangun (text/event-stream)',
            headers: {
              'Content-Type': { schema: { type: 'string', example: 'text/event-stream' } },
              'Cache-Control': { schema: { type: 'string', example: 'no-cache' } },
            },
          },
        },
      },
    },
    '/live/notifications/system': {
      post: {
        tags: ['Live Monitoring'],
        summary: 'Kirim Notifikasi Sistem ke Seluruh Dashboard (Admin Only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description'],
                properties: {
                  title: { type: 'string', example: 'Pembaruan Server Absensi' },
                  description: { type: 'string', example: 'Server akan di-restart pada jam 23.00 WIB malam ini.' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Berhasil dikirim & dibroadcast',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Notifikasi sistem berhasil dikirim' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/recognition-events': {
      post: {
        tags: ['ML & Ingestion'],
        summary: 'Webhook Catat Deteksi Realtime (ML Engine Only)',
        description: 'Endpoint ingestion untuk mencatat hasil pengenalan realtime dan broadcast via SSE (menggunakan x-api-key).',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventId', 'employeeId', 'cameraId', 'similarity', 'timestamp'],
                properties: {
                  eventId: { type: 'string', example: '9a9d7cd5-60e5-4a1d-a0db-7c64eb3e9db7' },
                  employeeId: { type: 'string', example: 'EMP001', nullable: true, description: 'Null jika wajah tidak dikenal (unknown)' },
                  cameraId: { type: 'string', example: 'cctv-lobby' },
                  similarity: { type: 'number', example: 0.96 },
                  timestamp: { type: 'string', format: 'date-time', example: '2026-08-06T12:00:00.000Z' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Pencatatan & broadcast berhasil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Pencatatan deteksi berhasil' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/settings': {
      get: {
        tags: ['Web System Settings'],
        summary: 'Dapatkan Data Pengaturan Sistem Absensi',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Konfigurasi sistem',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Settings' },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Web System Settings'],
        summary: 'Update Seluruh Pengaturan Sistem (Admin Only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  organizationName: { type: 'string', example: 'PT Berjaya Baru' },
                  lateTolerance: { type: 'integer', example: 20 },
                  reminderInterval: { type: 'integer', example: 45 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Berhasil diperbarui',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Pengaturan sistem berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Web System Settings'],
        summary: 'Update Sebagian Pengaturan Sistem (Admin Only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  lateTolerance: { type: 'integer', example: 10 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Berhasil diperbarui',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Pengaturan sistem berhasil diperbarui' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/settings/reset': {
      post: {
        tags: ['Web System Settings'],
        summary: 'Reset Pengaturan Sistem ke Default (Admin Only)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Berhasil di-reset',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Pengaturan sistem dikembalikan ke default' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Utilities'],
        summary: 'API Health Check',
        responses: {
          200: {
            description: 'Status berjalan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'API berjalan' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
