import { Role } from '@prisma/client';

export interface LoginRequestBody {
  email: string;
  password: string;
}

export type AppRole = Role | 'EMPLOYEE';

export interface JwtPayload {
  sub: string;
  email: string | null;
  role: AppRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: AppRole;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}
