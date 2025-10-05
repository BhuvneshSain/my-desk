import type { Employee } from '../../generated/prisma';
import type { PublicEmployee } from './types';

export function toPublicEmployee(employee: Employee): PublicEmployee {
  return {
    id: employee.id,
    email: employee.email,
    fullName: employee.fullName,
    role: employee.role,
    workInchargeId: employee.workInchargeId ?? null,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}
