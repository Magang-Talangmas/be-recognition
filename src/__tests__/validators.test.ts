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
        employeeId: 'EMP001',
        name: 'Budi Santoso',
        department: 'Engineering',
        position: 'Developer',
      });

      expect(result.employeeId).toBe('EMP001');
      expect(result.name).toBe('Budi Santoso');
    });

    it('harus berhasil tanpa department dan position (optional)', () => {
      const result = createEmployeeSchema.parse({
        employeeId: 'EMP001',
        name: 'Budi',
      });

      expect(result.department).toBeUndefined();
      expect(result.position).toBeUndefined();
    });

    it('harus gagal jika employeeId kosong', () => {
      expect(() =>
        createEmployeeSchema.parse({ employeeId: '', name: 'Budi' }),
      ).toThrow();
    });

    it('harus gagal jika name tidak ada', () => {
      expect(() =>
        createEmployeeSchema.parse({ employeeId: 'EMP001' }),
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
      expect(result.limit).toBe(20);
    });

    it('harus berhasil dengan filter department', () => {
      const result = employeeFilterSchema.parse({
        department: 'Engineering',
        page: '2',
        limit: '10',
      });

      expect(result.department).toBe('Engineering');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('harus transform isActive string ke boolean', () => {
      const resultTrue = employeeFilterSchema.parse({ isActive: 'true' });
      expect(resultTrue.isActive).toBe(true);

      const resultFalse = employeeFilterSchema.parse({ isActive: 'false' });
      expect(resultFalse.isActive).toBe(false);
    });

    it('harus isActive undefined jika value bukan true/false', () => {
      const result = employeeFilterSchema.parse({ isActive: 'maybe' });
      expect(result.isActive).toBeUndefined();
    });

    it('harus gagal jika limit > 100', () => {
      expect(() =>
        employeeFilterSchema.parse({ limit: '101' }),
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
