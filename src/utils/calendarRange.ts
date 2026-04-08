import type { MarkedDates } from 'react-native-calendars/src/types';

/** Jours calendaires YYYY-MM-DD entre deux bornes inclusives (pas d’effet fuseau à midi UTC). */
export function eachIsoDayInclusive(from: string, to: string): string[] {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (start > end) return eachIsoDayInclusive(to, from);
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Marquages « period » pour react-native-calendars. */
export function buildPeriodMarkings(
  rangeStart: string | null,
  rangeEnd: string | null,
  periodColor: string,
  textColor = '#ffffff'
): MarkedDates {
  if (!rangeStart) return {};
  const end = rangeEnd ?? rangeStart;
  const days = eachIsoDayInclusive(rangeStart, end);
  const marked: MarkedDates = {};
  const n = days.length;
  days.forEach((day, i) => {
    if (n === 1) {
      marked[day] = { startingDay: true, endingDay: true, color: periodColor, textColor };
    } else if (i === 0) {
      marked[day] = { startingDay: true, color: periodColor, textColor };
    } else if (i === n - 1) {
      marked[day] = { endingDay: true, color: periodColor, textColor };
    } else {
      marked[day] = { color: periodColor, textColor };
    }
  });
  return marked;
}
