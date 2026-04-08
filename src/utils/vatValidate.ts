import type { VatDetail } from '../types';
import { roundMoney } from './money';

/** Tolérance monétaire (arrondis ticket / caisse). */
export const VAT_MONEY_EPS = 0.03;

/** Tolérance pour « taux × base ≈ montant TVA » (lignes souvent arrondies au centime). */
export const VAT_RATE_LINE_EPS = 0.06;

export function sumVatBases(lines: VatDetail[]): number {
  return roundMoney(lines.reduce((s, l) => s + (Number(l.base) || 0), 0));
}

export function sumVatAmounts(lines: VatDetail[]): number {
  return roundMoney(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0));
}

/** TTC théorique à partir des lignes (Σ bases HT + Σ montants TVA). */
export function ttcFromVatLines(lines: VatDetail[]): number {
  return roundMoney(sumVatBases(lines) + sumVatAmounts(lines));
}

export interface VatTicketValidation {
  /** Peut être enregistré sans erreur bloquante. */
  ok: boolean;
  htMatchesSumBases: boolean;
  ttcMatchesLinesSum: boolean;
  lineRateOk: boolean[];
}

/**
 * Vérifie la cohérence montants globaux vs lignes TVA (ticket réel, plusieurs taux possibles).
 */
export function validateVatAgainstTicket(
  ht: number | null,
  ttc: number | null,
  lines: VatDetail[]
): VatTicketValidation {
  const basesSum = sumVatBases(lines);
  const amountsSum = sumVatAmounts(lines);
  const fromLines = roundMoney(basesSum + amountsSum);

  const htMatchesSumBases =
    ht !== null && ht >= 0 && Math.abs(ht - basesSum) <= VAT_MONEY_EPS;
  const ttcMatchesLinesSum =
    ttc !== null && ttc >= 0 && Math.abs(ttc - fromLines) <= VAT_MONEY_EPS;

  const lineRateOk = lines.map(l => {
    const base = Number(l.base) || 0;
    const amount = Number(l.amount) || 0;
    const rate = Number(l.rate) || 0;
    if (base <= 0 && amount <= 0) return true;
    if (rate <= 0) return true;
    const expected = roundMoney((base * rate) / 100);
    return Math.abs(expected - amount) <= VAT_RATE_LINE_EPS;
  });

  const ok =
    ht !== null &&
    ttc !== null &&
    lines.length > 0 &&
    htMatchesSumBases &&
    ttcMatchesLinesSum &&
    lineRateOk.every(Boolean);

  return {
    ok,
    htMatchesSumBases,
    ttcMatchesLinesSum,
    lineRateOk,
  };
}
