import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { Role } from '@prisma/client';

jest.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-yang-cukup-panjang-minimal-32',
    NODE_ENV: 'test',
  },
}));

jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
} as unknown as jest.Mocked<UserRepository>;

const JWT_SECRET = 'test-jwt-secret-yang-cukup-panjang-minimal-32';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(mockUserRepository);
  });

  describe('login', () => {
    const loginData = {
      email: 'admin@test.com',
      password: 'password123',
    };

    const hashedPassword = bcrypt.hashSync('password123', 10);

    const mockUser = {
      id: 'user-id-1',
      email: 'admin@test.com',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('harus mengembalikan token dan user data jika login berhasil', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.login(loginData);

      expect(result.token).toBeDefined();
      expect(result.user.id).toBe('user-id-1');
      expect(result.user.email).toBe('admin@test.com');
      expect(result.user.name).toBe('Admin User');
      expect(result.user.role).toBe(Role.ADMIN);

      // Verifikasi token bisa di-decode
      const decoded = jwt.verify(result.token, JWT_SECRET) as Record<string, unknown>;
      expect(decoded.sub).toBe('user-id-1');
      expect(decoded.email).toBe('admin@test.com');
      expect(decoded.role).toBe(Role.ADMIN);
    });

    it('harus melempar UnauthorizedError jika email tidak ditemukan', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedError);
      await expect(service.login(loginData)).rejects.toThrow('Email atau password salah');
    });

    it('harus melempar UnauthorizedError jika user tidak aktif', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(inactiveUser);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedError);
    });

    it('harus melempar UnauthorizedError jika password salah', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'admin@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('hashPassword', () => {
    it('harus mengembalikan hashed password yang valid', async () => {
      const password = 'test-password-123';
      const hashed = await AuthService.hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);

      // Verifikasi bahwa hash valid
      const isMatch = await bcrypt.compare(password, hashed);
      expect(isMatch).toBe(true);
    });

    it('harus menghasilkan hash yang berbeda untuk password yang sama', async () => {
      const password = 'test-password-123';
      const hash1 = await AuthService.hashPassword(password);
      const hash2 = await AuthService.hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt menggunakan random salt
    });
  });
});
