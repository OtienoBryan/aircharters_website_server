import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Predefined role constants
export const ROLES = {
  SUPERADMIN: 'superadmin',
  CIT_ADMIN: 'citAdmin',
  COMPANY_ADMIN: 'companyAdmin',
  AGENT: 'agent',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  FINANCE: 'finance',
  USER: 'user',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES]; 