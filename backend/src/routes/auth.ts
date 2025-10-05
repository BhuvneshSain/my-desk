import { Router } from 'express';
import type { Request, Response } from 'express';
import { EmployeeRole } from '../generated/prisma';
import prisma from '../lib/prisma';
import { authenticate, isRoleAtLeast, optionalAuthenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { hashPassword, verifyPassword } from '../modules/auth/password';
import { signToken } from '../modules/auth/token';
import { toPublicEmployee } from '../modules/auth/serializers';
import type { JwtPayload } from '../modules/auth/types';

const router = Router();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseRole(input: unknown): EmployeeRole | null {
  if (!input) return null;
  const value = String(input).toUpperCase();
  if (value in EmployeeRole) {
    return EmployeeRole[value as keyof typeof EmployeeRole];
  }
  return null;
}

router.post(
  '/signup',
  optionalAuthenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, role, workInchargeId } = req.body ?? {};
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password and fullName are required' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = normalizeEmail(String(email));
    const existingCount = await prisma.employee.count();

    let targetRole = parseRole(role) ?? EmployeeRole.STAFF;

    if (existingCount === 0) {
      targetRole = EmployeeRole.ADMIN;
    } else {
      if (!req.user || !isRoleAtLeast(req.user.role, EmployeeRole.INCHARGE)) {
        return res.status(403).json({ error: 'Only Incharge or Admin can create employees' });
      }
      if (targetRole === EmployeeRole.ADMIN && !isRoleAtLeast(req.user.role, EmployeeRole.ADMIN)) {
        return res.status(403).json({ error: 'Only Admin can create another Admin' });
      }
    }

    const passwordHash = await hashPassword(String(password));

    try {
      const employee = await prisma.employee.create({
        data: {
          email: normalizedEmail,
          password: passwordHash,
          fullName: String(fullName).trim(),
          role: targetRole,
          workInchargeId: workInchargeId ? String(workInchargeId) : null,
        },
      });

      const payload: JwtPayload = {
        sub: employee.id,
        email: employee.email,
        role: employee.role,
        fullName: employee.fullName,
      };
      const token = signToken(payload);

      return res.status(201).json({ token, user: toPublicEmployee(employee) });
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      throw error;
    }
  })
);

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const normalizedEmail = normalizeEmail(String(email));
    const employee = await prisma.employee.findUnique({ where: { email: normalizedEmail } });
    if (!employee) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(String(password), employee.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload: JwtPayload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
      fullName: employee.fullName,
    };
    const token = signToken(payload);

    return res.json({ token, user: toPublicEmployee(employee) });
  })
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json({ ok: true });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const employee = await prisma.employee.findUnique({ where: { id: req.user!.sub } });
    if (!employee) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.json(toPublicEmployee(employee));
  })
);

export default router;


