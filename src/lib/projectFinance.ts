import type { ProjectStatus } from '../types';

/** Étapes « Devis » (报价) et au-delà : montant devis obligatoire pour le rôle Sales. */
export const PROJECT_STATUSES_REQUIRING_CONTRACT_AMOUNT: ProjectStatus[] = [
  'quote',
  'contract',
  'delivery',
  'completed',
];

export function projectStatusRequiresContractAmount(status: ProjectStatus): boolean {
  return PROJECT_STATUSES_REQUIRING_CONTRACT_AMOUNT.includes(status);
}

/** Règle Sales : pop-up montant si entrée en pipeline Devis+, retour Contrat/Livraison → Devis, ou montant absent. */
export function salesShouldPromptContractAmount(params: {
  role: string | undefined;
  prevStatus: ProjectStatus;
  nextStatus: ProjectStatus;
  currentContractAmount: number | null | undefined;
}): boolean {
  if (params.role !== 'sales') return false;
  if (!projectStatusRequiresContractAmount(params.nextStatus)) return false;
  const { prevStatus, nextStatus, currentContractAmount } = params;
  const wasBelow = !projectStatusRequiresContractAmount(prevStatus);
  const dropToQuote =
    nextStatus === 'quote' &&
    (prevStatus === 'contract' || prevStatus === 'delivery' || prevStatus === 'completed');
  const missing = currentContractAmount == null || Number.isNaN(Number(currentContractAmount));
  return wasBelow || dropToQuote || missing;
}

function numOrZero(v: number | null | undefined): number {
  return v != null && !Number.isNaN(v) ? Number(v) : 0;
}

/**
 * Marge nette = contract_amount - coûts fixes (main-d'œuvre + location + matériaux)
 * - somme des notes de frais au statut approuvé (équivalent « Validé » côté app).
 */
export function computeNetMargin(params: {
  contractAmount: number | null | undefined;
  costLabor: number | null | undefined;
  costRent: number | null | undefined;
  costMaterials: number | null | undefined;
  validatedExpensesTtcSum: number;
}): number | null {
  const { contractAmount, costLabor, costRent, costMaterials, validatedExpensesTtcSum } = params;
  if (contractAmount == null || Number.isNaN(Number(contractAmount))) {
    return null;
  }
  const fixed =
    numOrZero(costLabor) + numOrZero(costRent) + numOrZero(costMaterials);
  const ca = Number(contractAmount);
  return ca - fixed - validatedExpensesTtcSum;
}
