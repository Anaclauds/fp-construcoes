import { SetMetadata } from '@nestjs/common';
import type { ModuloSistema } from '../permissions.constants';

export const PERMISSIONS_KEY = 'permissions';

export type PermissionAction = 'visualizar' | 'gerenciar';

export interface PermissionRequirement {
  modulo: ModuloSistema;
  acao: PermissionAction;
}

export const RequirePermission = (...requirements: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, requirements);
