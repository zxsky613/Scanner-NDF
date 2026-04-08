/** Parse un montant saisi (virgule ou point). */
export function parseMoney(value: string): number | null {
  const s = value.replace(/\s/g, '').replace(',', '.').trim();
  if (s === '' || s === '-' || s === '.') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
