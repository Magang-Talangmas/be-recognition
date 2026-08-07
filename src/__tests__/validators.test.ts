import { loginSchema } from '../validators/auth.validator';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeFilterSchema,
} from '../validators/employee.validator';
import {
  attendanceBodySchema,
  attendanceFilterSchema,
  updateConfirmationStatusSchema,
} from '../validators/attendance.validator';

describe('Auth Validator', () => {
  describe('loginSchema', () => {
    it('harus berhasil validasi data login yang valid', () => {
      const result = loginSchema.parse({
        email: 'Admin@Test.com',
        password: 'password123',
      });

      expect(result.email).toBe('admin@test.com'); // lowercase + trim
      expect(result.password).toBe('password123');
    });

    it('harus gagal jika email tidak valid', () => {
      expect(() =>
        loginSchema.parse({ email: 'bukan-email', password: 'pass123' }),
      ).toThrow();
    });

    it('harus gagal jika password kosong', () => {
      expect(() =>
        loginSchema.parse({ email: 'test@test.com', password: '' }),
      ).toThrow();
    });

    it('harus gagal jika email tidak ada', () => {
      expect(() => loginSchema.parse({ password: 'pass123' })).toThrow();
    });

    it('harus gagal jika password tidak ada', () => {
      expect(() => loginSchema.parse({ email: 'test@test.com' })).toThrow();
    });
  });
});

describe('Employee Validator', () => {
  describe('createEmployeeSchema', () => {
    it('harus berhasil validasi data employee valid', () => {
      const result = createEmployeeSchema.parse({
        name: 'Budi Santoso',
        email: 'budi@test.com',
        department: 'Engineering',
        position: 'Developer',
        status: 'Active',
      });

      expect(result.name).toBe('Budi Santoso');
      expect(result.email).toBe('budi@test.com');
      expect(result.status).toBe('Active');
    });

    it('harus berhasil tanpa field opsional', () => {
      const result = createEmployeeSchema.parse({
        name: 'Budi',
      });

      expect(result.department).toBeUndefined();
      expect(result.position).toBeUndefined();
    });

    it('harus transform string kosong menjadi undefined', () => {
      const result = createEmployeeSchema.parse({
        name: 'Budi',
        email: '',
        department: '',
      });

      expect(result.email).toBeUndefined();
      expect(result.department).toBeUndefined();
    });

    it('harus transform joinedAt string menjadi Date', () => {
      const result = createEmployeeSchema.parse({
        name: 'Budi',
        joinedAt: '2026-08-01',
      });

      expect(result.joinedAt).toBeInstanceOf(Date);
    });

    it('harus gagal jika email tidak valid', () => {
      expect(() =>
        createEmployeeSchema.parse({ name: 'Budi', email: 'bukan-email' }),
      ).toThrow();
    });

    it('harus gagal jika password < 6 karakter', () => {
      expect(() =>
        createEmployeeSchema.parse({ name: 'Budi', password: '123' }),
      ).toThrow();
    });

    it('harus gagal jika status bukan Active/Inactive', () => {
      expect(() =>
        createEmployeeSchema.parse({ name: 'Budi', status: 'Suspended' }),
      ).toThrow();
    });

    it('harus gagal jika name tidak ada', () => {
      expect(() => createEmployeeSchema.parse({})).toThrow();
    });
  });

  describe('updateEmployeeSchema', () => {
    it('harus berhasil dengan partial data (hanya name)', () => {
      const result = updateEmployeeSchema.parse({ name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('harus berhasil dengan object kosong', () => {
      const result = updateEmployeeSchema.parse({});

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('harus mengurai photoUrls dari JSON string menjadi array', () => {
      const result = updateEmployeeSchema.parse({
        photoUrls: '["https://f/1.jpg","https://f/2.jpg"]',
      });

      expect(result.photoUrls).toEqual(['https://f/1.jpg', 'https://f/2.jpg']);
    });

    it('harus menerima photoUrls "[]" (hapus semua foto)', () => {
      const result = updateEmployeeSchema.parse({ photoUrls: '[]' });

      expect(result.photoUrls).toEqual([]);
    });

    it('harus mengabaikan elemen non-string di photoUrls', () => {
      const result = updateEmployeeSchema.parse({
        photoUrls: '["https://f/1.jpg", 123, null]',
      });

      expect(result.photoUrls).toEqual(['https://f/1.jpg']);
    });

    it('harus gagal jika photoUrls bukan JSON valid', () => {
      expect(() => updateEmployeeSchema.parse({ photoUrls: 'bukan-json' })).toThrow();
    });

    it('harus gagal jika photoUrls bukan array', () => {
      expect(() => updateEmployeeSchema.parse({ photoUrls: '{"a":1}' })).toThrow();
    });
  });

  describe('employeeFilterSchema', () => {
    it('harus berhasil dengan default values', () => {
      const result = employeeFilterSchema.parse({});

      expect(result.page).toBe(1);
      expect(result.per_page).toBe(10);
    });

    it('harus berhasil dengan filter lengkap', () => {
      const result = employeeFilterSchema.parse({
        search: 'budi',
        department: 'Engineering',
        status: 'Active',
        page: '2',
        per_page: '25',
      });

      expect(result.search).toBe('budi');
      expect(result.department).toBe('Engineering');
      expect(result.status).toBe('Active');
      expect(result.page).toBe(2);
      expect(result.per_page).toBe(25);
    });

    it('harus gagal jika per_page > 100', () => {
      expect(() =>
        employeeFilterSchema.parse({ per_page: '101' }),
      ).toThrow();
    });

    it('harus gagal jika page < 1', () => {
      expect(() =>
        employeeFilterSchema.parse({ page: '0' }),
      ).toThrow();
    });
  });
});

describe('Attendance Validator', () => {
  describe('attendanceBodySchema', () => {
    const validPayload = {
      employee_id: 'EMP001',
      event_type: 'CHECK_IN',
      detected_at: '2026-08-04T13:02:37Z',
    };

    it('harus berhasil validasi payload minimal (tanpa field opsional)', () => {
      const result = attendanceBodySchema.parse(validPayload);
      expect(result.employee_id).toBe('EMP001');
      expect(result.event_type).toBe('CHECK_IN');
      expect(result.detected_at).toBe('2026-08-04T13:02:37Z');
    });

    it('harus berhasil validasi payload lengkap dari AI', () => {
      const result = attendanceBodySchema.parse({
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        employee_id: 'akmalShaumNadzirin',
        event_type: 'CHECK_OUT',
        similarity: 0.593,
        detected_at: '2026-08-04T13:02:37Z',
        camera_id: 'main-entrance',
      });
      expect(result.event_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.similarity).toBe(0.593);
    });

    it('harus berhasil untuk semua event_type yang valid', () => {
      const validTypes = [
        'CHECK_IN', 'CHECK_OUT', 'START_BREAK',
        'RETURN_FROM_BREAK', 'TEMPORARY_EXIT', 'RETURN_FROM_TEMPORARY_EXIT',
      ];
      validTypes.forEach((type) => {
        expect(() =>
          attendanceBodySchema.parse({ ...validPayload, event_type: type }),
        ).not.toThrow();
      });
    });

    it('harus GAGAL jika event_type tidak valid', () => {
      expect(() =>
        attendanceBodySchema.parse({ ...validPayload, event_type: 'PARKIR' }),
      ).toThrow();
    });

    it('harus GAGAL jika detected_at bukan ISO 8601', () => {
      expect(() =>
        attendanceBodySchema.parse({ ...validPayload, detected_at: '04-08-2026 13:00' }),
      ).toThrow();
    });

    it('harus GAGAL jika employee_id tidak ada', () => {
      expect(() =>
        attendanceBodySchema.parse({ event_type: 'CHECK_IN', detected_at: '2026-08-04T13:00:00Z' }),
      ).toThrow();
    });

    it('harus GAGAL jika event_id ada tapi bukan format UUID', () => {
      expect(() =>
        attendanceBodySchema.parse({ ...validPayload, event_id: 'bukan-uuid' }),
      ).toThrow();
    });

    it('harus GAGAL jika similarity di luar range 0–1', () => {
      expect(() =>
        attendanceBodySchema.parse({ ...validPayload, similarity: 1.5 }),
      ).toThrow();
      expect(() =>
        attendanceBodySchema.parse({ ...validPayload, similarity: -0.1 }),
      ).toThrow();
    });
  });


  describe('attendanceFilterSchema', () => {
    it('harus berhasil dengan default values', () => {
      const result = attendanceFilterSchema.parse({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('harus berhasil dengan filter lengkap', () => {
      const result = attendanceFilterSchema.parse({
        employee_id: 'EMP001',
        start_date: '2026-08-01T00:00:00Z',
        end_date: '2026-08-03T23:59:59Z',
        page: '2',
        limit: '50',
      });

      expect(result.employee_id).toBe('EMP001');
      expect(result.start_date).toBe('2026-08-01T00:00:00Z');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('harus berhasil parsing confirmation_status', () => {
      const result = attendanceFilterSchema.parse({
        confirmation_status: 'pending',
      });
      expect(result.confirmation_status).toBe('PENDING');
    });

    it('harus gagal jika start_date bukan ISO 8601', () => {
      expect(() =>
        attendanceFilterSchema.parse({ start_date: 'bukan-tanggal' }),
      ).toThrow();
    });

    it('harus gagal jika limit > 100', () => {
      expect(() =>
        attendanceFilterSchema.parse({ limit: '200' }),
      ).toThrow();
    });
  });

  describe('updateConfirmationStatusSchema', () => {
    it('harus berhasil validasi status CONFIRMED, REJECTED, PENDING', () => {
      expect(updateConfirmationStatusSchema.parse({ status: 'confirmed' }).status).toBe('CONFIRMED');
      expect(updateConfirmationStatusSchema.parse({ status: 'REJECTED' }).status).toBe('REJECTED');
      expect(updateConfirmationStatusSchema.parse({ status: 'pending' }).status).toBe('PENDING');
    });

    it('harus GAGAL jika status tidak valid', () => {
      expect(() =>
        updateConfirmationStatusSchema.parse({ status: 'APPROVED' }),
      ).toThrow();
    });
  });
});
