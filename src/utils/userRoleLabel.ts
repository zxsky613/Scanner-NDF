import type { TFunction } from 'i18next';
import type { StoredUserRole } from '../types';

export function userRoleLabel(role: StoredUserRole, t: TFunction): string {
  if (role === 'manager') return t('roles.finance');
  return t(`roles.${role}`);
}
