import type { DateRange } from './calendar.types';

/**
 * Granularity-agnostic Single/Range/Multi state transition logic (ADR-0001 main
 * decision), parameterized by an equality function so the same rules serve both
 * day-granularity (CalendarEngine, isSameDay) and month/quarter/year-granularity
 * (GranularityPickerEngine) callers without duplicating the constitution §4 state
 * machine twice. Pure functions only — no signals, no Angular.
 */
export type DateEqualsFn = (a: Date, b: Date) => boolean;
export type DateKeyFn = (date: Date) => string;

/**
 * Single-selection toggle (constitution §4): re-picking the current selection
 * clears it only when allowDeselect is true; picking anything else replaces it.
 */
export function toggleSingleSelection(
  current: Date | null,
  date: Date,
  allowDeselect: boolean,
  equalsFn: DateEqualsFn,
): Date | null {
  if (current !== null && equalsFn(current, date)) {
    return allowDeselect ? null : current;
  }
  return date;
}

/**
 * Range Draft state machine (Decision 3): first pick opens the draft, second pick
 * commits it (endpoints ordered chronologically) and closes the draft. Ordering
 * uses raw Date#getTime(), which is granularity-agnostic — a later period's anchor
 * is always a larger timestamp regardless of granularity.
 */
export function advanceRangeDraft(
  draftStart: Date | null,
  date: Date,
): { draftStart: Date | null; committedRange: DateRange | null } {
  if (draftStart === null) {
    return { draftStart: date, committedRange: null };
  }
  const [start, end] = draftStart.getTime() <= date.getTime() ? [draftStart, date] : [date, draftStart];
  return { draftStart: null, committedRange: { start, end } };
}

/**
 * Multi-selection toggle (I6 / Decision 11): a period already in the collection is
 * removed, otherwise added — always, regardless of allowDeselect (that flag only
 * governs the single-mode re-pick-to-deselect interaction). keyFn normalizes a Date
 * to its period identity (e.g. "2026-3" for a month) so the underlying Map dedupes
 * correctly even across distinct Date instances representing the same period.
 */
export function toggleMultiSelection(
  current: ReadonlyMap<string, Date>,
  date: Date,
  keyFn: DateKeyFn,
): Map<string, Date> {
  const key = keyFn(date);
  const next = new Map(current);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.set(key, date);
  }
  return next;
}

/**
 * Programmatic bulk write for multi mode (R7 / Decision 13): each date is checked
 * independently against `isDisabled`; disabled ones are silently dropped rather
 * than rejecting the whole batch (I6's "each member independently toggleable" —
 * same policy as CalendarEngine.setSelectedDates()).
 */
export function filterSelectedDates(
  dates: Date[],
  keyFn: DateKeyFn,
  isDisabled: (date: Date) => boolean,
): Map<string, Date> {
  const next = new Map<string, Date>();
  for (const date of dates) {
    if (!isDisabled(date)) {
      next.set(keyFn(date), date);
    }
  }
  return next;
}
