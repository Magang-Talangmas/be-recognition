import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { LoginInput } from '../validators/auth.validator';
import { LoginResponse, JwtPayload } from '../interfaces/auth.interface';

const JWT_EXPIRY = '24h';
const BCRYPT_SALT_ROUNDS = 12;

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async login(data: LoginInput): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(data.email);

    if (!user || !user.isActive) {
      logger.warn('Percobaan login dengan email tidak terdaftar atau tidak aktif', {
        email: data.email,
      });
      // Sama pesan untuk mencegah user enumeration
      throw new UnauthorizedError('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      logger.warn('Percobaan login dengan password salah', { userId: user.id });
      throw new UnauthorizedError('Email atau password salah');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

    logger.info('Login berhasil', { userId: user.id });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }
}
