import { Router } from 'express';
import type { Request, Response } from 'express';
import { EmployeeRole } from '../generated/prisma';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { hashPassword } from '../modules/auth/password';
import { toPublicEmployee } from '../modules/auth/serializers';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(employees.map(toPublicEmployee));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string | undefined;
    if (!id) {
      return res.status(400).json({ error: 'Employee id is required' });
    }
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    return res.json(toPublicEmployee(employee));
  })
);

router.post(
  '/',
  requireRole([EmployeeRole.INCHARGE, EmployeeRole.ADMIN]),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, role, workInchargeId } = req.body ?? {};
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password and fullName are required' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const parsedRole = role && String(role).toUpperCase() in EmployeeRole ? EmployeeRole[String(role).toUpperCase() as keyof typeof EmployeeRole] : EmployeeRole.STAFF;

    if (parsedRole === EmployeeRole.ADMIN && req.user?.role !== EmployeeRole.ADMIN) {
      return res.status(403).json({ error: 'Only Admin can create another Admin' });
    }

    const passwordHash = await hashPassword(String(password));

    try {
      const employee = await prisma.employee.create({
        data: {
          email: normalizedEmail,
          password: passwordHash,
          fullName: String(fullName).trim(),
          role: parsedRole,
          workInchargeId: workInchargeId ? String(workInchargeId) : null,
        },
      });

      return res.status(201).json(toPublicEmployee(employee));
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      throw error;
    }
  })
);

router.put(
  '/:id',
  requireRole([EmployeeRole.INCHARGE, EmployeeRole.ADMIN]),
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string | undefined;
    if (!id) {
      return res.status(400).json({ error: 'Employee id is required' });
    }

    const { fullName, role, workInchargeId } = req.body ?? {};

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    let nextRole = existing.role;
    if (role) {
      const normalizedRole = String(role).toUpperCase();
      if (normalizedRole in EmployeeRole) {
        nextRole = EmployeeRole[normalizedRole as keyof typeof EmployeeRole];
      }
    }

    if (nextRole === EmployeeRole.ADMIN && req.user?.role !== EmployeeRole.ADMIN) {
      return res.status(403).json({ error: 'Only Admin can assign Admin role' });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        fullName: typeof fullName === 'string' ? fullName.trim() : existing.fullName,
        role: nextRole,
        workInchargeId: workInchargeId ? String(workInchargeId) : null,
      },
    });

    return res.json(toPublicEmployee(employee));
  })
);

router.delete(
  '/:id',
  requireRole([EmployeeRole.INCHARGE, EmployeeRole.ADMIN]),
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string | undefined;
    if (!id) {
      return res.status(400).json({ error: 'Employee id is required' });
    }

    if (req.user?.sub === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    try {
      await prisma.employee.delete({ where: { id } });
      return res.json({ ok: true });
    } catch {
      return res.status(404).json({ error: 'Employee not found' });
    }
  })
);

export default router;
