import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { addDays } from 'date-fns/addDays';
import { differenceInCalendarDays } from 'date-fns/differenceInCalendarDays';
import { endOfWeek } from 'date-fns/endOfWeek';
import { isSameDay } from 'date-fns/isSameDay';
import { isValid } from 'date-fns/isValid';
import { startOfWeek } from 'date-fns/startOfWeek';
import { isDisabledByAny } from '../shared/calendar-disabled';
import { CALENDAR_LOCALE, CALENDAR_TODAY } from '../shared/calendar.tokens';
import type {
  CalendarDay,
  CalendarLocale,
  DateRange,
  DisabledInput,
  FocusMoveDirection,
  RangeDayCountLimit,
} from '../shared/calendar.types';
import { buildMonthGrid } from './calendar-grid';

export type { FocusMoveDirection } from '../shared/calendar.types';

/** Normalises a Date to midnight for day-level range comparisons. */
function dayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** O(1) isSameDay equivalent used as Map key for multi-selection (I6). */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * R8 / Decision 14: inclusive day count (differenceInCalendarDays(end, start) + 1),
 * e.g. Jul 1 → Jul 3 counts as 3 days. No limit configured always passes.
 */
function isWithinDayCountLimit(
  start: Date,
  end: Date,
  limit: RangeDayCountLimit | undefined,
): boolean {
  if (limit === undefined) {
    return true;
  }
  const dayCount = differenceInCalendarDays(end, start) + 1;
  if (limit.minDays !== undefined && dayCount < limit.minDays) {
    return false;
  }
  if (limit.maxDays !== undefined && dayCount > limit.maxDays) {
    return false;
  }
  return true;
}

const EMPTY_RANGE: DateRange = { start: null, end: null };

/**
 * Headless calendar state machine.
 *
 * M4 adds: cross-month focus auto-transfer (Decision 6) and multi-month
 * parallel grid output (Decision 8, monthsToDisplay input, sliding-window
 * paging).  WAI-ARIA attribute wiring is the consumer's responsibility;
 * the engine provides the data signals, the directive provides keyboard
 * handling (.claude/prds/date-picker.md §10).
 *
 * Component-scoped: provide this per calendar instance (`providers: [CalendarEngine]`),
 * not `providedIn: 'root'` — two pickers on the same page must not share state.
 */
@Injectable()
export class CalendarEngine {
  private readonly injector = inject(Injector);
  private readonly todayFn = inject(CALENDAR_TODAY);

  private readonly _viewDate = signal<Date>(this.todayFn());
  private readonly _selectionMode = signal<'single' | 'range' | 'multi'>('single');
  private readonly _monthsToDisplay = signal<number>(1);
  private readonly _selectedDate = signal<Date | null>(null);
  private readonly _selectedRange = signal<DateRange>(EMPTY_RANGE);
  private readonly _draftStart = signal<Date | null>(null);
  private readonly _focusedDate = signal<Date | null>(null);
  private readonly _allowDeselect = signal(true);
  private readonly _localeOverride = signal<CalendarLocale | undefined>(undefined);
  private readonly _disabled = signal<DisabledInput | undefined>(undefined);
  private readonly _rangeDayCountLimit = signal<RangeDayCountLimit | undefined>(undefined);
  /** M6 / I6: Map<dayKey, Date> — O(1) lookup; value preserves caller's original Date (R2). */
  private readonly _selectedDates = signal<ReadonlyMap<string, Date>>(new Map());

  /**
   * Decision 7: an explicit `setLocale()` override wins; otherwise fall back to
   * the app-level CALENDAR_LOCALE token. Reading `injector.get()` here (rather
   * than `inject()`) lets this stay lazy — if the consumer always calls
   * `setLocale()`, an app that never provided CALENDAR_LOCALE still works.
   */
  private readonly resolvedLocale = computed<CalendarLocale>(
    () => this._localeOverride() ?? this.injector.get(CALENDAR_LOCALE),
  );

  readonly selectedDate = this._selectedDate.asReadonly();
  readonly selectedRange = this._selectedRange.asReadonly();
  /** Non-multi modes: always an empty array. Multi mode: all accumulated dates (Decision 11 / I6). */
  readonly selectedDates = computed<Date[]>(() => [...this._selectedDates().values()]);
  /** Non-null only while a range selection is in progress (isDraftActive = true). */
  readonly draftStart = this._draftStart.asReadonly();
  readonly focusedDate = this._focusedDate.asReadonly();
  /** True while the first range endpoint has been picked but the second has not. */
  readonly isDraftActive = computed(() => this._draftStart() !== null);

  /**
   * Decision 8: N parallel 42-cell month grids, sliding window — nextMonth()/
   * prevMonth() always shift by exactly one month regardless of monthsToDisplay.
   * I3 invariant holds for each inner array (length always 42).
   */
  readonly monthGrids = computed<CalendarDay[][]>(() => {
    const locale = this.resolvedLocale();
    const mode = this._selectionMode();
    const selected = this._selectedDate();
    const range = this._selectedRange();
    const draftStart = this._draftStart();
    const focused = this._focusedDate();
    const today = this.todayFn();
    const monthsToDisplay = this._monthsToDisplay();
    const viewDate = this._viewDate();
    const selectedDatesMap = this._selectedDates();

    // Resolve the effective display range for range mode.
    let effectiveStart: Date | null = null;
    let effectiveEnd: Date | null = null;

    if (mode === 'range') {
      if (draftStart !== null) {
        effectiveStart = draftStart;
        effectiveEnd = focused; // null → no end preview yet
      } else {
        effectiveStart = range.start;
        effectiveEnd = range.end;
      }
      if (effectiveStart !== null && effectiveEnd !== null) {
        if (dayMs(effectiveStart) > dayMs(effectiveEnd)) {
          [effectiveStart, effectiveEnd] = [effectiveEnd, effectiveStart];
        }
      }
    }

    const grids: CalendarDay[][] = [];
    for (let offset = 0; offset < monthsToDisplay; offset++) {
      const monthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
      const grid = buildMonthGrid(monthDate, locale.weekStartsOn).map((cell): CalendarDay => {
        let isSelected = false;
        let isRangeStart = false;
        let isRangeEnd = false;
        let isInRange = false;

        if (mode === 'single') {
          isSelected = selected !== null && isSameDay(cell.date, selected);
        } else if (mode === 'multi') {
          isSelected = selectedDatesMap.has(dayKey(cell.date));
        } else {
          const cellMs = cell.date.getTime();
          if (effectiveStart !== null && isSameDay(cell.date, effectiveStart)) {
            isRangeStart = true;
            isSelected = true;
          }
          if (effectiveEnd !== null && isSameDay(cell.date, effectiveEnd)) {
            isRangeEnd = true;
            isSelected = true;
          }
          if (effectiveStart !== null && effectiveEnd !== null) {
            const sMs = dayMs(effectiveStart);
            const eMs = dayMs(effectiveEnd);
            isInRange = cellMs > sMs && cellMs < eMs;
          }
        }

        return {
          date: cell.date,
          isCurrentMonth: cell.isCurrentMonth,
          isToday: isSameDay(cell.date, today),
          isSelected,
          isRangeStart,
          isRangeEnd,
          isInRange,
          isDisabled: this.isDateDisabled(cell.date),
          isFocused: focused !== null && isSameDay(cell.date, focused),
        };
      });
      grids.push(grid);
    }
    return grids;
  });

  setLocale(locale: CalendarLocale | undefined): void {
    this._localeOverride.set(locale);
  }

  /** Decision 8: number of parallel months to display; minimum clamped to 1. */
  setMonthsToDisplay(n: number): void {
    this._monthsToDisplay.set(Math.max(1, Math.floor(n)));
  }

  /** Switches selection mode and resets all selection state to avoid cross-mode leakage (Decision 11). */
  setSelectionMode(mode: 'single' | 'range' | 'multi'): void {
    this._selectionMode.set(mode);
    this._selectedDate.set(null);
    this._selectedRange.set(EMPTY_RANGE);
    this._draftStart.set(null);
    this._selectedDates.set(new Map());
  }

  /** Whether re-selecting the already-selected date clears it (constitution §4). */
  setAllowDeselect(allow: boolean): void {
    this._allowDeselect.set(allow);
  }

  /**
   * Unified disabled-date matcher — single day / array / interval / predicate,
   * OR-combined (R4 / Decision 5).
   *
   * I2 enforcement: any existing selection (single date, committed range, or draft
   * start) that is now caught by the new matcher is destroyed outright — not masked.
   */
  setDisabled(input: DisabledInput | undefined): void {
    this._disabled.set(input);

    const selected = this._selectedDate();
    if (selected !== null && this.isDateDisabled(selected)) {
      this._selectedDate.set(null);
    }

    const range = this._selectedRange();
    if (
      (range.start !== null && this.isDateDisabled(range.start)) ||
      (range.end !== null && this.isDateDisabled(range.end))
    ) {
      this._selectedRange.set(EMPTY_RANGE);
    }

    const ds = this._draftStart();
    if (ds !== null && this.isDateDisabled(ds)) {
      this._draftStart.set(null);
    }

    const currentDates = this._selectedDates();
    if (currentDates.size > 0) {
      const next = new Map(currentDates);
      let changed = false;
      for (const [key, date] of next) {
        if (this.isDateDisabled(date)) {
          next.delete(key);
          changed = true;
        }
      }
      if (changed) {
        this._selectedDates.set(next);
      }
    }
  }

  /**
   * R8 / Decision 14: optional min/max day-count bound on range selections.
   * Zero-default — undefined means unbounded (I4 weekStartsOn Zero-default
   * precedent), needs explicit injection to take effect.
   *
   * I2-style proactive clear: a limit that the currently committed selectedRange
   * now violates destroys that selection outright, mirroring setDisabled() rather
   * than masking a now-invalid stable value.
   */
  setRangeDayCountLimit(limit: RangeDayCountLimit | undefined): void {
    this._rangeDayCountLimit.set(limit);

    const range = this._selectedRange();
    if (
      range.start !== null &&
      range.end !== null &&
      !isWithinDayCountLimit(range.start, range.end, limit)
    ) {
      this._selectedRange.set(EMPTY_RANGE);
    }
  }

  /** I1: viewDate must always be a valid Date; invalid input falls back to today. */
  setViewDate(date: Date): void {
    this._viewDate.set(isValid(date) ? date : this.todayFn());
  }

  nextMonth(): void {
    const current = this._viewDate();
    this.setViewDate(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  prevMonth(): void {
    const current = this._viewDate();
    this.setViewDate(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  /**
   * Moves keyboard focus.
   *
   * Decision 6 (M4): arrow keys that would leave the visible grid window
   * auto-page by one month and land on the corresponding logical cell in the
   * new window.  Home/End stay within the current week row, never crossing
   * a month boundary.  PageUp/PageDown change month explicitly and carry
   * focus to the same day-of-month, clamped to the shorter month.
   *
   * Multi-month (Decision 8): left/right/up/down/home/end are computed by
   * plain calendar-day arithmetic (addDays/startOfWeek/endOfWeek) rather than
   * indexing into the flattened N-grid array. The flat-index approach this
   * replaced assumed each month's independently-built 42-cell grid tiled
   * cleanly after the previous one — false whenever monthsToDisplay > 1:
   * adjacent months' grids commonly *overlap* (e.g. Feb's trailing overflow
   * days and March's leading overflow days can both be early-March dates,
   * each at a different flat position), so stepping through the flat array
   * could revisit already-seen dates or skip backward at grid boundaries.
   * Day arithmetic sidesteps this entirely — a date is a date regardless of
   * which grid(s) happen to also display it as overflow.
   */
  moveFocus(direction: FocusMoveDirection): void {
    if (direction === 'pageup' || direction === 'pagedown') {
      const dayOfMonth = (this._focusedDate() ?? this._viewDate()).getDate();
      if (direction === 'pageup') {
        this.prevMonth();
      } else {
        this.nextMonth();
      }
      const newViewDate = this._viewDate();
      const daysInNewMonth = new Date(
        newViewDate.getFullYear(),
        newViewDate.getMonth() + 1,
        0,
      ).getDate();
      this._focusedDate.set(
        new Date(
          newViewDate.getFullYear(),
          newViewDate.getMonth(),
          Math.min(dayOfMonth, daysInNewMonth),
        ),
      );
      return;
    }

    const baseline = this._focusedDate() ?? this._selectedDate() ?? this.todayFn();
    const weekStartsOn = this.resolvedLocale().weekStartsOn;

    // Home/End: the week containing the focused date, regardless of which
    // grid(s) render that week — never crosses a month boundary by definition
    // (a calendar week's days are fixed; only which month "owns" each cell varies).
    if (direction === 'home') {
      this._focusedDate.set(startOfWeek(baseline, { weekStartsOn }));
      return;
    }
    if (direction === 'end') {
      this._focusedDate.set(endOfWeek(baseline, { weekStartsOn }));
      return;
    }

    let target: Date;
    switch (direction) {
      case 'left':
        target = addDays(baseline, -1);
        break;
      case 'right':
        target = addDays(baseline, 1);
        break;
      case 'up':
        target = addDays(baseline, -7);
        break;
      case 'down':
        target = addDays(baseline, 7);
        break;
    }

    // Page the window one month at a time (Decision 8: nextMonth()/prevMonth()
    // always shift by exactly one month) until target's month falls inside the
    // visible [viewDate, viewDate + monthsToDisplay) range. A single ±7-day step
    // only ever crosses one month boundary, but the loop (rather than assuming
    // exactly one page) also self-corrects if focus had gone stale relative to
    // the current view (e.g. after mouse-driven prevMonth()/nextMonth() clicks).
    for (;;) {
      const viewDate = this._viewDate();
      const monthsAhead =
        (target.getFullYear() - viewDate.getFullYear()) * 12 +
        (target.getMonth() - viewDate.getMonth());
      if (monthsAhead < 0) {
        this.prevMonth();
      } else if (monthsAhead >= this._monthsToDisplay()) {
        this.nextMonth();
      } else {
        break;
      }
    }
    this._focusedDate.set(target);
  }

  /**
   * Single-selection state machine (constitution §4):
   * unselected → selected on any valid pick; selected → unselected only when
   * the same date is re-picked AND allowDeselect is true, otherwise it holds.
   *
   * Range state machine (§4 Range Selection):
   * first valid pick → Draft (draftStart set, selectedRange unchanged);
   * second valid pick → commit (selectedRange updated, draft cleared).
   *
   * A disabled date is always a no-op in both modes (I2: Selected ∩ Disabled = Ø).
   */
  selectDate(date: Date): void {
    if (this.isDateDisabled(date)) {
      return;
    }

    const mode = this._selectionMode();

    if (mode === 'single') {
      const current = this._selectedDate();
      if (current !== null && isSameDay(current, date)) {
        if (this._allowDeselect()) {
          this._selectedDate.set(null);
        }
        return;
      }
      this._selectedDate.set(date);
      return;
    }

    // Multi mode: toggle — always, regardless of allowDeselect (Decision 11).
    if (mode === 'multi') {
      const key = dayKey(date);
      const current = new Map(this._selectedDates());
      if (current.has(key)) {
        current.delete(key);
      } else {
        current.set(key, date);
      }
      this._selectedDates.set(current);
      return;
    }

    // Range mode
    const ds = this._draftStart();
    if (ds === null) {
      this._draftStart.set(date);
    } else {
      const [start, end] = dayMs(ds) <= dayMs(date) ? [ds, date] : [date, ds];
      // R8 / Decision 14: an out-of-bound endpoint is rejected outright — the
      // draft stays open at its original start, waiting for a valid pick.
      if (!isWithinDayCountLimit(start, end, this._rangeDayCountLimit())) {
        return;
      }
      this._selectedRange.set({ start, end });
      this._draftStart.set(null);
    }
  }

  /**
   * R7 / Decision 13: programmatic write path (e.g. binding an existing value
   * when editing a form). Same disabled check as selectDate(), but deliberately
   * NOT the re-pick-to-deselect toggle.
   *
   * This is not just "for consistency with the other set*() methods" — selectDate()'s
   * toggle is an *interpretation of a repeated user interaction event* (gated by
   * allowDeselect, a flag that only makes sense for that interaction). This method
   * is a *declaration of what the current state is*, not an event to interpret, so
   * it must not reuse that interaction's reading. Calling it with the same date
   * twice (e.g. a form re-applying its bound value) is therefore idempotent — it
   * never clears the selection, unlike selectDate().
   */
  setSelectedDate(date: Date): void {
    if (this.isDateDisabled(date)) {
      return;
    }
    this._selectedDate.set(date);
  }

  /**
   * R7 / Decision 13: direct range write, bypassing the Draft mechanism entirely
   * — both endpoints arrive at once, so there is nothing to draft. Either
   * endpoint hitting a disabled date, or the pair violating the configured
   * day-count limit (R8), rejects the whole write (selectedRange keeps its
   * previous value) rather than writing a partial/invalid range (Decision 3
   * "range is one indivisible transaction" precedent). Also clears any
   * in-progress draft — writing a stable range directly must not leave a ghost
   * draft behind.
   */
  setSelectedRange(range: DateRange): void {
    if (range.start === null && range.end === null) {
      this._selectedRange.set(EMPTY_RANGE);
      this._draftStart.set(null);
      return;
    }
    if (range.start === null || range.end === null) {
      return; // half-specified range is not a valid committed value
    }
    if (this.isDateDisabled(range.start) || this.isDateDisabled(range.end)) {
      return;
    }
    const [start, end] =
      dayMs(range.start) <= dayMs(range.end) ? [range.start, range.end] : [range.end, range.start];
    if (!isWithinDayCountLimit(start, end, this._rangeDayCountLimit())) {
      return;
    }
    this._selectedRange.set({ start, end });
    this._draftStart.set(null);
  }

  /**
   * Decision 3: discards the in-progress Draft without touching selectedRange.
   * Because the Draft state lives in a completely separate signal (_draftStart)
   * and is never written into _selectedRange, clearing it is sufficient —
   * no snapshot/rollback mechanism needed.
   */
  abortRangeDraft(): void {
    this._draftStart.set(null);
  }

  /** §8: clears the selection only — viewDate is deliberately left untouched. */
  clearSelection(): void {
    const mode = this._selectionMode();
    if (mode === 'single') {
      this._selectedDate.set(null);
    } else if (mode === 'multi') {
      this._selectedDates.set(new Map());
    } else {
      this._selectedRange.set(EMPTY_RANGE);
      this._draftStart.set(null);
    }
  }

  /**
   * M6 / Decision 11: programmatic single-item removal for multi mode (e.g. a "remove"
   * button in a selection chip list, distinct from the click-toggle path).
   * No-op when the date is not in the collection. Throws in non-multi modes because
   * there is no meaningful "remove one from a non-collection" operation — a caller bug.
   */
  removeDate(date: Date): void {
    if (this._selectionMode() !== 'multi') {
      throw new Error('removeDate() is only valid in multi selection mode');
    }
    const key = dayKey(date);
    const current = this._selectedDates();
    if (!current.has(key)) return;
    const next = new Map(current);
    next.delete(key);
    this._selectedDates.set(next);
  }

  /**
   * R7 / Decision 13: programmatic bulk write for multi mode. Each date is
   * individually checked against the disabled matcher — disabled dates are silently
   * dropped from the write (same silent-reject contract as setSelectedDate/setSelectedRange).
   * Duplicate dates (same calendar day) are deduplicated by the Map key.
   */
  setSelectedDates(dates: Date[]): void {
    const next = new Map<string, Date>();
    for (const date of dates) {
      if (!this.isDateDisabled(date)) {
        next.set(dayKey(date), date);
      }
    }
    this._selectedDates.set(next);
  }

  /** Supports both direct queries (external, tests) and the engine's own I2 enforcement. */
  isDateDisabled(date: Date): boolean {
    const disabled = this._disabled();
    return disabled !== undefined && isDisabledByAny(date, disabled);
  }
}
