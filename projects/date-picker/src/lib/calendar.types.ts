/**
 * Public domain types for @sanring/date-picker.
 * Source of truth: .claude/prds/date-picker.md §6, .claude/constitutions/date-picker.md §3/§5/§6
 */

/** Re-exported so consumers don't need date-fns as a direct dependency just to name this type. */
export type { Day } from 'date-fns';
import type { Day } from 'date-fns';

/** Minimal grid cell unit. One of exactly 42 cells produced per rendered month (R3 / I3). */
export interface CalendarDay {
  /** Full Date object, time components zeroed (R2 extended to grid-cell granularity). */
  date: Date;
  /** Whether this cell belongs to the month `viewDate` points at (R3 overflow marker). */
  isCurrentMonth: boolean;
  /** Whether this cell is "today", per the CALENDAR_TODAY injection basis (Decision 4). */
  isToday: boolean;
  /** Whether this cell matches selectedDate (single mode) or a selectedRange endpoint (range mode). */
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
