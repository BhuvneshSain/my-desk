import type { RequestHandler } from 'express';
import { EmployeeRole } from '../generated/prisma';
import { decodeAuthorizationHeader } from '../modules/auth/token';

const roleHierarchy: Record<EmployeeRole, number> = {
  [EmployeeRole.ADMIN]: 3,
  [EmployeeRole.INCHARGE]: 2,
  [EmployeeRole.STAFF]: 1,
};

export const authenticate: RequestHandler = (req, res, next) => {
  const payload = decodeAuthorizationHeader(req.headers.authorization);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = payload;
  return next();
};

export function optionalAuthenticate(): RequestHandler {
  return (req, _res, next) => {
    const payload = decodeAuthorizationHeader(req.headers.authorization);
    if (payload) {
      req.user = payload;
    }
    next();
  };
}

export function requireRole(minRole: EmployeeRole | EmployeeRole[]): RequestHandler {
  const roles = Array.isArray(minRole) ? minRole : [minRole];
  const minRank = Math.max(...roles.map((role) => roleHierarchy[role] ?? 0));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userRank = roleHierarchy[req.user.role] ?? 0;
    if (userRank < minRank) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export function isRoleAtLeast(role: EmployeeRole, target: EmployeeRole): boolean {
  return roleHierarchy[role] >= roleHierarchy[target];
}
