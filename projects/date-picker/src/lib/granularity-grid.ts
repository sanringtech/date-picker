import { addMonths } from 'date-fns/addMonths';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfYear } from 'date-fns/startOfYear';
import type { QuarterStartMonth } from './calendar.types';

/**
 * Pure month/quarter/year grid math for GranularityPickerEngine (R6, ADR-0001).
 * No Angular, no selection state — just "which period anchor falls in which cell".
 * Selection/disabled/today/focus flags are layered on top by GranularityPickerEngine,
 * mirroring the calendar-grid.ts / CalendarEngine split for the day grid.
 */

export interface GranularityGridCell {
  /** Anchor Date for this period (first day of the month/quarter/year), time zeroed (R2). */
  date: Date;
}

export const MONTH_GRID_SIZE = 12;
export const QUARTER_GRID_SIZE = 4;

/** 12 cells, January through December of viewDate's calendar year. */
export function buildMonthGranularityGrid(viewDate: Date): GranularityGridCell[] {
  const yearStart = startOfYear(viewDate);
  return Array.from({ length: MONTH_GRID_SIZE }, (_, i) => ({
    date: addMonths(yearStart, i),
  }));
}

/**
 * The fiscal year (per quarterStartMonth) that contains viewDate: the most recent
 * quarterStartMonth on or before viewDate. E.g. quarterStartMonth=3 (April) and
 * viewDate=Feb 2026 belongs to the fiscal year starting April 2025.
 */
function fiscalYearStart(viewDate: Date, quarterStartMonth: QuarterStartMonth): Date {
  const year =
    viewDate.getMonth() >= quarterStartMonth ? viewDate.getFullYear() : viewDate.getFullYear() - 1;
  return startOfMonth(new Date(year, quarterStartMonth, 1));
}

/** 4 cells covering the fiscal year (per quarterStartMonth) that contains viewDate. */
export function buildQuarterGranularityGrid(
  viewDate: Date,
  quarterStartMonth: QuarterStartMonth,
): GranularityGridCell[] {
  const yearStart = fiscalYearStart(viewDate, quarterStartMonth);
  return Array.from({ length: QUARTER_GRID_SIZE }, (_, i) => ({
    date: addMonths(yearStart, i * 3),
  }));
}

/**
 * `count` consecutive calendar years starting at viewDate's year — a sliding
 * window, same shape as CalendarEngine's monthsToDisplay (Decision 8): the window
 * always starts at viewDate, count only changes how many cells are produced.
 */
export function buildYearGranularityGrid(viewDate: Date, count: number): GranularityGridCell[] {
  const yearStart = startOfYear(viewDate);
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(yearStart.getFullYear() + i, 0, 1),
  }));
}

/** Which of the 4 fiscal quarters (0-3) viewDate falls in, per quarterStartMonth. */
export function quarterIndexOf(date: Date, quarterStartMonth: QuarterStartMonth): number {
  return Math.floor(((date.getMonth() - quarterStartMonth + 12) % 12) / 3);
}

/** Do `a` and `b` fall in the same fiscal quarter (same fiscal year AND same quarter index)? */
export function isSameFiscalQuarter(a: Date, b: Date, quarterStartMonth: QuarterStartMonth): boolean {
  return (
    fiscalYearStart(a, quarterStartMonth).getTime() === fiscalYearStart(b, quarterStartMonth).getTime() &&
    quarterIndexOf(a, quarterStartMonth) === quarterIndexOf(b, quarterStartMonth)
  );
}

/** Stable per-fiscal-quarter identity string, for use as a multi-selection Map key. */
export function fiscalQuarterKey(date: Date, quarterStartMonth: QuarterStartMonth): string {
  return `${fiscalYearStart(date, quarterStartMonth).getFullYear()}-Q${quarterIndexOf(date, quarterStartMonth)}`;
}
