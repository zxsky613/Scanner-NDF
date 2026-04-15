import type { StoredUserRole } from '../types';

/** Suivi des notes (équipe finance / anciens managers). */
export function hasExpenseManagementAccess(role: StoredUserRole | undefined): boolean {
  return role === 'finance' || role === 'manager';
}

/** Onglet CRM & Projets : commercial, finance, ou ancien rôle manager. */
export function hasCrmAccess(role: StoredUserRole | undefined): boolean {
  return role === 'sales' || role === 'finance' || role === 'manager';
}

/** Onglet Finance (marge, conditions) : uniquement le rôle finance. */
export function hasFinanceTabAccess(role: StoredUserRole | undefined): boolean {
  return role === 'finance';
}

/**
 * Modifier ou supprimer un projet : le créateur (`created_by`) ou la finance.
 * Les autres commerciaux (et l’ancien rôle manager, sauf s’il est créateur) n’y ont pas accès côté UI ;
 * l’application réelle est imposée par les politiques RLS sur `projects`.
 */
export function canManageProject(
  role: StoredUserRole | undefined,
  currentUserId: string | undefined,
  projectCreatedBy: string | null | undefined
): boolean {
  if (role === 'finance') return true;
  if (!currentUserId || !projectCreatedBy) return false;
  return projectCreatedBy === currentUserId;
}
