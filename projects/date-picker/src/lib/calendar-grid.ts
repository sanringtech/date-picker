import { addDays } from 'date-fns/addDays';
import { isSameMonth } from 'date-fns/isSameMonth';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import type { Day } from './calendar.types';

/**
 * Pure 42-day grid math. No Angular, no selection state — just "which date
 * falls in which of the 42 cells, and is it inside the current month".
 * Selection/disabled/today/focus flags are layered on top by CalendarEngine.
 *
 * Invariants this function must uphold (constitution R3 / I3):
 * - Output length is always exactly 42, regardless of the month's day count.
 * - Overflow cells (from the previous/next month) fill the leading/trailing gaps.
 * - Each cell's `date` has its time components zeroed (R2 extended to cell granularity).
 */

export interface MonthGridCell {
  date: Date;
  isCurrentMonth: boolean;
}

export const GRID_SIZE = 42;

/**
 * @param viewDate Any date within the month to render. Only year/month are used.
 * @param weekStartsOn 0=Sunday...6=Saturday, per CalendarLocale.weekStartsOn.
 */
export function buildMonthGrid(viewDate: Date, weekStartsOn: Day): MonthGridCell[] {
  const monthStart = startOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });

  return Array.from({ length: GRID_SIZE }, (_, offset) => {
    const date = addDays(gridStart, offset);
    return {
      date,
      isCurrentMonth: isSameMonth(date, monthStart),
    };
  });
}
