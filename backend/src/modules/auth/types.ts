import type { EmployeeRole } from '../../generated/prisma';

export interface JwtPayload {
  sub: string; // employee id
  email: string;
  role: EmployeeRole;
  fullName: string;
  iat?: number;
  exp?: number;
}

export interface AuthToken {
  token: string;
  expiresIn: number;
}

export interface AuthResponse {
  token: string;
  user: PublicEmployee;
}

export interface PublicEmployee {
  id: string;
  email: string;
  fullName: string;
  role: EmployeeRole;
  workInchargeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
