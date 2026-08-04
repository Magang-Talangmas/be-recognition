import { loginSchema } from '../validators/auth.validator';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeFilterSchema,
} from '../validators/employee.validator';
import {
  attendanceBodySchema,
  attendanceFilterSchema,
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
        name: 'Andi Pratama',
        email: 'Andi@talangmas.co.id',
        position: 'Staff IT',
        department: 'Information Technology',
        status: 'Active',
        joinedAt: '2023-02-14',
      });

      expect(result.email).toBe('andi@talangmas.co.id'); // lowercase + trim
      expect(result.name).toBe('Andi Pratama');
      expect(result.status).toBe('Active');
    });

    it('harus berhasil tanpa status dan joinedAt (optional)', () => {
      const result = createEmployeeSchema.parse({
        name: 'Budi',
        email: 'budi@test.com',
        position: 'Developer',
        department: 'Engineering',
      });

      expect(result.status).toBeUndefined();
      expect(result.joinedAt).toBeUndefined();
    });

    it('harus gagal jika email tidak valid', () => {
      expect(() =>
        createEmployeeSchema.parse({
          name: 'Budi',
          email: 'bukan-email',
          position: 'Developer',
          department: 'Engineering',
        }),
      ).toThrow();
    });

    it('harus gagal jika name tidak ada', () => {
      expect(() =>
        createEmployeeSchema.parse({
          email: 'budi@test.com',
          position: 'Developer',
          department: 'Engineering',
        }),
      ).toThrow();
    });

    it('harus gagal jika joinedAt bukan format YYYY-MM-DD', () => {
      expect(() =>
        createEmployeeSchema.parse({
          name: 'Budi',
          email: 'budi@test.com',
          position: 'Developer',
          department: 'Engineering',
          joinedAt: '14-02-2023',
        }),
      ).toThrow();
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
  });

  describe('employeeFilterSchema', () => {
    it('harus berhasil dengan default values', () => {
      const result = employeeFilterSchema.parse({});

      expect(result.page).toBe(1);
      expect(result.per_page).toBe(10);
    });

    it('harus berhasil dengan filter lengkap', () => {
      const result = employeeFilterSchema.parse({
        search: 'andi',
        department: 'Information Technology',
        status: 'Active',
        page: '2',
        per_page: '10',
      });

      expect(result.search).toBe('andi');
      expect(result.department).toBe('Information Technology');
      expect(result.status).toBe('Active');
      expect(result.page).toBe(2);
      expect(result.per_page).toBe(10);
    });

    it('harus transform status string', () => {
      const resultActive = employeeFilterSchema.parse({ status: 'Active' });
      expect(resultActive.status).toBe('Active');

      const resultInactive = employeeFilterSchema.parse({ status: 'Inactive' });
      expect(resultInactive.status).toBe('Inactive');
    });

    it('harus status undefined jika value tidak dikenal', () => {
      const result = employeeFilterSchema.parse({ status: 'maybe' });
      expect(result.status).toBeUndefined();
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
    it('harus berhasil validasi data attendance valid', () => {
      const result = attendanceBodySchema.parse({
        employee_id: 'EMP001',
        camera_id: 'CAM01',
        timestamp: '2026-08-03T08:00:00Z',
      });

      expect(result.employee_id).toBe('EMP001');
      expect(result.camera_id).toBe('CAM01');
    });

    it('harus gagal jika timestamp bukan ISO 8601', () => {
      expect(() =>
        attendanceBodySchema.parse({
          employee_id: 'EMP001',
          camera_id: 'CAM01',
          timestamp: '2026-08-03 08:00:00',
        }),
      ).toThrow();
    });

    it('harus gagal jika employee_id tidak ada', () => {
      expect(() =>
        attendanceBodySchema.parse({
          camera_id: 'CAM01',
          timestamp: '2026-08-03T08:00:00Z',
        }),
      ).toThrow();
    });

    it('harus gagal jika camera_id kosong', () => {
      expect(() =>
        attendanceBodySchema.parse({
          employee_id: 'EMP001',
          camera_id: '',
          timestamp: '2026-08-03T08:00:00Z',
        }),
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
});
