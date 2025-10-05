import jwt, { SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from './types';

const JWT_SECRET = process.env.JWT_SECRET || '';
const DEFAULT_EXPIRY = process.env.JWT_EXPIRES_IN || '12h';

type SignExpires = Exclude<SignOptions['expiresIn'], undefined>;

if (!JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Tokens cannot be issued securely.');
}

export function signToken(payload: JwtPayload, expiresIn: string | number = DEFAULT_EXPIRY): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  const expires: SignExpires = (typeof expiresIn === 'number' ? expiresIn : String(expiresIn)) as SignExpires;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expires });
}

export function verifyToken(token: string): JwtPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function decodeAuthorizationHeader(header?: string | null): JwtPayload | null {
  if (!header) return null;
  const [type, value] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !value) return null;
  try {
    return verifyToken(value.trim());
  } catch {
    return null;
  }
}
