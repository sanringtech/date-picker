/**
 * Public domain types for @sanring/date-picker.
 * Source of truth: .claude/prds/date-picker.md §6, .claude/constitutions/date-picker.md §3/§5/§6
 */

/** Re-exported so consumers don't need date-fns as a direct dependency just to name this type. */
export type { Day } from 'date-fns';
import type { Day } from 'date-fns';

/**
 * Full set of focus-movement directions shared by CalendarEngine.moveFocus()
 * and GranularityPickerEngine.moveFocus() — lives here (not in either engine's
 * own file) so neither module has to import the other just to name this type.
 */
export type FocusMoveDirection =
  'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'pageup' | 'pagedown';

/** Minimal grid cell unit. One of exactly 42 cells produced per rendered month (R3 / I3). */
export interface CalendarDay {
  /** Full Date object, time components zeroed (R2 extended to grid-cell granularity). */
  date: Date;
  /** Whether this cell belongs to the month `viewDate` points at (R3 overflow marker). */
  isCurrentMonth: boolean;
  /** Whether this cell is "today", per the CALENDAR_TODAY injection basis (Decision 4). */
  isToday: boolean;
  /** Matches selectedDate (single), a selectedRange endpoint (range), or any entry in selectedDates (multi). */
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  /** Falls inside selectedRange, or inside the Draft preview range while a range selection is in progress (Open Questions #5: resolved as "yes, reflect draft preview"). */
  isInRange: boolean;
  /** Matches a DisabledInput matcher. Invariant I2: isSelected && isDisabled is always false. */
  isDisabled: boolean;
  /** Current keyboard focus landing cell (Decision 6). */
  isFocused: boolean;
}

/** Inclusive date interval, used both for disabled-date ranges and selected ranges. */
export interface DateInterval {
  from: Date;
  to: Date;
}

/** A single way of expressing "this date matches". */
export type DateMatcher = Date | Date[] | DateInterval | ((date: Date) => boolean);

/** One matcher, or an array of matchers combined with OR (R4 / Decision 5). */
export type DisabledInput = DateMatcher | DateMatcher[];

/** Stable committed value of a range selection (§4 Range Selection). */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Optional day-count bound on range selections (R8 / Decision 14). Zero-default:
 * both bounds undefined means unbounded, mirroring CalendarLocale's Zero-default
 * precedent (I4) rather than baking in any built-in limit.
 * Day count is inclusive of both endpoints (differenceInCalendarDays(end, start) + 1).
 */
export interface RangeDayCountLimit {
  minDays?: number;
  maxDays?: number;
}

/**
 * Optional period-count bound on GranularityPickerEngine range selections —
 * the month/quarter/year-granularity counterpart to RangeDayCountLimit (R8's
 * day-count bound doesn't transfer directly: "days" isn't a meaningful unit
 * once the selectable unit is itself a month/quarter/year). Zero-default,
 * same as RangeDayCountLimit: both bounds undefined means unbounded.
 * Count is inclusive of both endpoints, e.g. selecting Jan–Mar counts as 3
 * months; selecting the same quarter twice counts as 1.
 */
export interface RangePeriodCountLimit {
  minPeriods?: number;
  maxPeriods?: number;
}

/**
 * Selection unit for GranularityPickerEngine (R6 / Decision 12 / ADR-0001).
 * 'day' is CalendarEngine's existing (implicit) granularity, included here only
 * so the union is complete for callers that need to name all four; GranularityPickerEngine
 * itself only accepts 'month' | 'quarter' | 'year'.
 */
export type Granularity = 'day' | 'month' | 'quarter' | 'year';

/**
 * Minimal grid cell unit for month/quarter/year granularity (R6). Deliberately not
 * a rename/reuse of CalendarDay — CalendarDay is the day-grid cell (constitution §6
 * Glossary); reusing it here would blur that existing term. All three granularities
 * share this one interface rather than splitting into MonthCell/QuarterCell/YearCell
 * (constitution §4 Granularity Selection: "no separate rules per granularity").
 * No `granularity` discriminant field (ADR-0001 sub-decision 2) — a given
 * GranularityPickerEngine instance is only ever in one granularity at a time
 * (setSelectionGranularity() resets state on switch, mirroring setSelectionMode()),
 * so callers already know the granularity from the signal/method they used.
 */
export interface GranularityCell {
  /** Anchor Date for the period this cell represents (first day of the month/quarter/year), time zeroed (R2). */
  date: Date;
  /** Whether this cell's period contains "today", per the CALENDAR_TODAY injection basis (Decision 4). */
  isCurrentPeriod: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isDisabled: boolean;
  isFocused: boolean;
}

/**
 * Quarter start month (Decision 12: calendar-quarter vs fiscal-quarter ambiguity).
 * 0 = January ... 11 = December.
 * ADR-0001 sub-decision 1: no default — CALENDAR_QUARTER_STARTS_ON has no default
 * factory, mirroring CALENDAR_LOCALE's Zero-default (I4) precedent, because which
 * month starts a "quarter" is a business calendar convention, not a neutral fact.
 */
export type QuarterStartMonth = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Externally-injected localization contract (I4 / Decision 7). No built-in defaults. */
export interface CalendarLocale {
  /** Week start day. Mirrors date-fns startOfWeek() options.weekStartsOn; 0=Sunday...6=Saturday. */
  weekStartsOn: Day;
  /** 7 weekday labels, index aligned to JS Date.getDay() (0=Sun). */
  weekdayLabels: readonly string[];
  /** 12 month labels, index 0 = January. */
  monthLabels: readonly string[];
  /** Optional date-fns Locale object, for future formatting delegation. Grid math only depends on weekStartsOn. */
  dateFnsLocale?: import('date-fns').Locale;
}
