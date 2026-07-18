import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { isSameMonth } from 'date-fns/isSameMonth';
import { isSameYear } from 'date-fns/isSameYear';
import { isValid } from 'date-fns/isValid';
import { isDisabledByAny } from './calendar-disabled';
import type { FocusMoveDirection } from './calendar-engine';
import { CALENDAR_QUARTER_STARTS_ON, CALENDAR_TODAY } from './calendar.tokens';
import type { DateRange, DisabledInput, GranularityCell, QuarterStartMonth } from './calendar.types';
import {
  buildMonthGranularityGrid,
  buildQuarterGranularityGrid,
  buildYearGranularityGrid,
  fiscalQuarterKey,
  isSameFiscalQuarter,
} from './granularity-grid';
import {
  advanceRangeDraft,
  filterSelectedDates,
  toggleMultiSelection,
  toggleSingleSelection,
  type DateEqualsFn,
  type DateKeyFn,
} from './selection-state';

/** GranularityPickerEngine's own domain — day granularity stays CalendarEngine's job. */
export type PickerGranularity = 'month' | 'quarter' | 'year';

const EMPTY_RANGE: DateRange = { start: null, end: null };

/**
 * Headless Month/Quarter/Year-picker state machine (R6, Decision 12, ADR-0001).
 *
 * A sibling of CalendarEngine, not an extension of it — see ADR-0001 for why
 * (day-grid's fixed 42-cell / ±7 keyboard-paging assumptions don't generalize to
 * 12/4/N-cell granularity grids). Single/Range/Multi state transitions are the
 * same rules as CalendarEngine's, called through the shared parameterized
 * functions in `selection-state.ts` rather than reimplemented here.
 *
 * Component-scoped: provide this per picker instance (`providers: [GranularityPickerEngine]`),
 * matching CalendarEngine's provider convention.
 */
@Injectable()
export class GranularityPickerEngine {
  private readonly injector = inject(Injector);
  private readonly todayFn = inject(CALENDAR_TODAY);

  private readonly _viewDate = signal<Date>(this.todayFn());
  private readonly _granularity = signal<PickerGranularity>('month');
  private readonly _selectionMode = signal<'single' | 'range' | 'multi'>('single');
  /** Only meaningful for granularity 'year' — sliding window size, min clamped to 1 (Decision 8 precedent). */
  private readonly _yearsToDisplay = signal<number>(12);
  private readonly _selectedDate = signal<Date | null>(null);
  private readonly _selectedRange = signal<DateRange>(EMPTY_RANGE);
  private readonly _draftStart = signal<Date | null>(null);
  private readonly _focusedDate = signal<Date | null>(null);
  private readonly _allowDeselect = signal(true);
  private readonly _disabled = signal<DisabledInput | undefined>(undefined);
  /** M6-equivalent multi container: Map<periodKey, Date> — see selection-state.ts DateKeyFn. */
  private readonly _selectedDates = signal<ReadonlyMap<string, Date>>(new Map());
  /**
   * Column count for up/down keyboard focus math (2026-07-18 delta). Unlike the day
   * grid's ±7, there is no structural "row unit" for month/quarter/year grids — column
   * count is a pure presentation choice the consumer makes, not a business rule, so
   * it gets a sensible default (3) rather than CALENDAR_QUARTER_STARTS_ON-style
   * Zero-default treatment: no business assumption is being smuggled in by defaulting it.
   */
  private readonly _gridColumns = signal<number>(3);

  readonly selectedDate = this._selectedDate.asReadonly();
  readonly selectedRange = this._selectedRange.asReadonly();
  /** Non-multi modes: always an empty array. Multi mode: all accumulated periods. */
  readonly selectedDates = computed<Date[]>(() => [...this._selectedDates().values()]);
  readonly draftStart = this._draftStart.asReadonly();
  readonly focusedDate = this._focusedDate.asReadonly();
  readonly isDraftActive = computed(() => this._draftStart() !== null);

  /**
   * Lazy resolution (injector.get(), not inject()) so this only throws when a
   * quarter-granularity operation actually needs it — a consumer that only ever
   * uses 'month'/'year' granularity is never forced to provide this token
   * (ADR-0001 sub-decision 1: CALENDAR_QUARTER_STARTS_ON has no default factory).
   */
  private resolveQuarterStartMonth(): QuarterStartMonth {
    return this.injector.get(CALENDAR_QUARTER_STARTS_ON);
  }

  /**
   * `quarterStartMonth` is an optional pre-resolved value so hot paths that
   * already read the token once (granularityGrids()) don't trigger a second/third
   * injector.get() for the same recompute — callers that don't have it handy
   * (selectDate(), removeDate(), etc.) fall back to resolving it themselves.
   */
  private equalsFnFor(granularity: PickerGranularity, quarterStartMonth?: QuarterStartMonth): DateEqualsFn {
    switch (granularity) {
      case 'month':
        return isSameMonth;
      case 'quarter': {
        const qsm = quarterStartMonth ?? this.resolveQuarterStartMonth();
        return (a, b) => isSameFiscalQuarter(a, b, qsm);
      }
      case 'year':
        return isSameYear;
    }
  }

  private keyFnFor(granularity: PickerGranularity, quarterStartMonth?: QuarterStartMonth): DateKeyFn {
    switch (granularity) {
      case 'month':
        return (date) => `${date.getFullYear()}-${date.getMonth()}`;
      case 'quarter': {
        const qsm = quarterStartMonth ?? this.resolveQuarterStartMonth();
        return (date) => fiscalQuarterKey(date, qsm);
      }
      case 'year':
        return (date) => `${date.getFullYear()}`;
    }
  }

  /**
   * Month=12 / Quarter=4 / Year=N cells (R6). Each cell's `date` is its period's
   * anchor (first day of month/quarter/year). Quarter granularity reads
   * CALENDAR_QUARTER_STARTS_ON on every recompute — omitting it while granularity
   * is 'quarter' throws (Angular NullInjectorError), by design (ADR-0001).
   */
  readonly granularityGrids = computed<GranularityCell[]>(() => {
    const granularity = this._granularity();
    const mode = this._selectionMode();
    const selected = this._selectedDate();
    const range = this._selectedRange();
    const draftStart = this._draftStart();
    const focused = this._focusedDate();
    const today = this.todayFn();
    const viewDate = this._viewDate();
    const selectedDatesMap = this._selectedDates();
    // Resolved once per recompute (not once each inside equalsFnFor/keyFnFor/the
    // switch below) — three injector.get() calls for the same value was wasted work.
    const quarterStartMonth = granularity === 'quarter' ? this.resolveQuarterStartMonth() : undefined;
    const equalsFn = this.equalsFnFor(granularity, quarterStartMonth);
    const keyFn = this.keyFnFor(granularity, quarterStartMonth);

    let cells: { date: Date }[];
    switch (granularity) {
      case 'month':
        cells = buildMonthGranularityGrid(viewDate);
        break;
      case 'quarter':
        cells = buildQuarterGranularityGrid(viewDate, quarterStartMonth!);
        break;
      case 'year':
        cells = buildYearGranularityGrid(viewDate, this._yearsToDisplay());
        break;
    }

    let effectiveStart: Date | null = null;
    let effectiveEnd: Date | null = null;
    if (mode === 'range') {
      if (draftStart !== null) {
        effectiveStart = draftStart;
        effectiveEnd = focused;
      } else {
        effectiveStart = range.start;
        effectiveEnd = range.end;
      }
      if (
        effectiveStart !== null &&
        effectiveEnd !== null &&
        effectiveStart.getTime() > effectiveEnd.getTime()
      ) {
        [effectiveStart, effectiveEnd] = [effectiveEnd, effectiveStart];
      }
    }

    return cells.map(({ date }): GranularityCell => {
      let isSelected = false;
      let isRangeStart = false;
      let isRangeEnd = false;
      let isInRange = false;

      if (mode === 'single') {
        isSelected = selected !== null && equalsFn(date, selected);
      } else if (mode === 'multi') {
        isSelected = selectedDatesMap.has(keyFn(date));
      } else {
        const cellMs = date.getTime();
        if (effectiveStart !== null && equalsFn(date, effectiveStart)) {
          isRangeStart = true;
          isSelected = true;
        }
        if (effectiveEnd !== null && equalsFn(date, effectiveEnd)) {
          isRangeEnd = true;
          isSelected = true;
        }
        if (effectiveStart !== null && effectiveEnd !== null) {
          isInRange = cellMs > effectiveStart.getTime() && cellMs < effectiveEnd.getTime();
        }
      }

      return {
        date,
        isCurrentPeriod: equalsFn(date, today),
        isSelected,
        isRangeStart,
        isRangeEnd,
        isInRange,
        isDisabled: this.isDateDisabled(date),
        isFocused: focused !== null && equalsFn(date, focused),
      };
    });
  });

  /** Switches granularity and resets all selection state (mirrors setSelectionMode()). */
  setSelectionGranularity(granularity: PickerGranularity): void {
    this._granularity.set(granularity);
    this._selectedDate.set(null);
    this._selectedRange.set(EMPTY_RANGE);
    this._draftStart.set(null);
    this._selectedDates.set(new Map());
  }

  /** Switches selection mode and resets all selection state to avoid cross-mode leakage. */
  setSelectionMode(mode: 'single' | 'range' | 'multi'): void {
    this._selectionMode.set(mode);
    this._selectedDate.set(null);
    this._selectedRange.set(EMPTY_RANGE);
    this._draftStart.set(null);
    this._selectedDates.set(new Map());
  }

  /** Whether re-picking the current selection clears it; multi mode's toggle ignores this. */
  setAllowDeselect(allow: boolean): void {
    this._allowDeselect.set(allow);
  }

  /** Year granularity only: sliding window size, minimum clamped to 1 (Decision 8 precedent). */
  setYearsToDisplay(n: number): void {
    this._yearsToDisplay.set(Math.max(1, Math.floor(n)));
  }

  /** Up/down keyboard focus step size — must match however the consumer lays out the grid. */
  setGridColumns(n: number): void {
    this._gridColumns.set(Math.max(1, Math.floor(n)));
  }

  /** I1: viewDate must always be a valid Date; invalid input falls back to today. */
  setViewDate(date: Date): void {
    this._viewDate.set(isValid(date) ? date : this.todayFn());
  }

  /** Shifts the grid window by one calendar year — one fiscal year for quarter granularity. */
  nextYear(): void {
    const current = this._viewDate();
    this.setViewDate(new Date(current.getFullYear() + 1, current.getMonth(), current.getDate()));
  }

  prevYear(): void {
    const current = this._viewDate();
    this.setViewDate(new Date(current.getFullYear() - 1, current.getMonth(), current.getDate()));
  }

  /**
   * Moves keyboard focus (2026-07-18 delta — PRD §7 "粒度選取網格鍵盤互動對應表").
   * Column count for up/down is consumer-supplied (setGridColumns()) since
   * month/quarter/year grids have no day-grid-equivalent fixed row unit (a
   * calendar week); Home/End jump to the whole grid's first/last cell rather than
   * a "row" scope, which doesn't exist here; boundary-crossing arrow keys and
   * PageUp/PageDown auto-page by one year (Decision 6 precedent), landing on the
   * corresponding index in the new window (clamped — relevant mainly if a future
   * caller shrinks yearsToDisplay between pages).
   */
  moveFocus(direction: FocusMoveDirection): void {
    const grids = this.granularityGrids();
    if (grids.length === 0) {
      return;
    }

    const equalsFn = this.equalsFnFor(this._granularity());
    const baseline = this._focusedDate() ?? this._selectedDate() ?? this.todayFn();
    const baselineIndex = grids.findIndex((cell) => equalsFn(cell.date, baseline));
    const currentIndex = baselineIndex === -1 ? 0 : baselineIndex;

    if (direction === 'pageup' || direction === 'pagedown') {
      if (direction === 'pageup') {
        this.prevYear();
      } else {
        this.nextYear();
      }
      const newGrids = this.granularityGrids();
      const clamped = Math.min(currentIndex, newGrids.length - 1);
      this._focusedDate.set(newGrids[clamped]?.date ?? null);
      return;
    }

    if (direction === 'home') {
      this._focusedDate.set(grids[0].date);
      return;
    }
    if (direction === 'end') {
      this._focusedDate.set(grids[grids.length - 1].date);
      return;
    }

    const columns = this._gridColumns();
    let target = currentIndex;
    switch (direction) {
      case 'left':
        target -= 1;
        break;
      case 'right':
        target += 1;
        break;
      case 'up':
        target -= columns;
        break;
      case 'down':
        target += columns;
        break;
    }

    // Month grid = 12 cells, quarter grid = 4 cells: both happen to span exactly the
    // 1 year that nextYear()/prevYear() shifts by, so "wrap around by one full grid
    // width" lands on the correct logical cell. Year grid does NOT share that property
    // — its width is the consumer-set yearsToDisplay, but nextYear()/prevYear() always
    // slides the window by exactly 1 year regardless (Decision 8 sliding-window
    // precedent) — so a boundary crossing there reveals exactly one new edge cell
    // rather than flipping to a same-relative-offset cell a full grid-width away.
    const granularity = this._granularity();
    if (target < 0) {
      this.prevYear();
      const newGrids = this.granularityGrids();
      const newIndex =
        granularity === 'year' ? 0 : Math.max(0, Math.min(newGrids.length + target, newGrids.length - 1));
      this._focusedDate.set(newGrids[newIndex]?.date ?? null);
    } else if (target >= grids.length) {
      this.nextYear();
      const newGrids = this.granularityGrids();
      const newIndex =
        granularity === 'year'
          ? newGrids.length - 1
          : Math.max(0, Math.min(target - grids.length, newGrids.length - 1));
      this._focusedDate.set(newGrids[newIndex]?.date ?? null);
    } else {
      this._focusedDate.set(grids[target].date);
    }
  }

  /**
   * Unified disabled-period matcher (R4 / Decision 5), reused as-is from the day
   * grid — isDisabledByAny operates on Date values regardless of what period they
   * anchor. I2 enforcement: any existing selection caught by a new matcher is
   * destroyed outright, not masked (mirrors CalendarEngine.setDisabled()).
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
   * Dispatches by selectionMode, delegating the actual state transition to the
   * shared parameterized functions in selection-state.ts (ADR-0001). A disabled
   * period is always a no-op (I2: Selected ∩ Disabled = Ø).
   */
  selectDate(date: Date): void {
    if (this.isDateDisabled(date)) {
      return;
    }

    const mode = this._selectionMode();
    const granularity = this._granularity();

    if (mode === 'single') {
      this._selectedDate.set(
        toggleSingleSelection(this._selectedDate(), date, this._allowDeselect(), this.equalsFnFor(granularity)),
      );
      return;
    }

    if (mode === 'multi') {
      this._selectedDates.set(toggleMultiSelection(this._selectedDates(), date, this.keyFnFor(granularity)));
      return;
    }

    const result = advanceRangeDraft(this._draftStart(), date);
    this._draftStart.set(result.draftStart);
    if (result.committedRange !== null) {
      this._selectedRange.set(result.committedRange);
    }
  }

  /**
   * R7 / Decision 13: programmatic write path, single mode. Same disabled check as
   * selectDate(), but not the re-pick-to-deselect toggle — idempotent, unlike
   * selectDate() (mirrors CalendarEngine.setSelectedDate()).
   */
  setSelectedDate(date: Date): void {
    if (this.isDateDisabled(date)) {
      return;
    }
    this._selectedDate.set(date);
  }

  /**
   * R7 / Decision 13: direct range write, range mode. Either endpoint hitting a
   * disabled period rejects the whole write (Decision 3's "range is one
   * indivisible transaction"). Also clears any in-progress draft.
   */
  setSelectedRange(range: DateRange): void {
    if (range.start === null && range.end === null) {
      this._selectedRange.set(EMPTY_RANGE);
      this._draftStart.set(null);
      return;
    }
    if (range.start === null || range.end === null) {
      return;
    }
    if (this.isDateDisabled(range.start) || this.isDateDisabled(range.end)) {
      return;
    }
    const [start, end] =
      range.start.getTime() <= range.end.getTime() ? [range.start, range.end] : [range.end, range.start];
    this._selectedRange.set({ start, end });
    this._draftStart.set(null);
  }

  /**
   * R7 / Decision 13: programmatic bulk write, multi mode. Each date is checked
   * independently against the disabled matcher — disabled ones are dropped, not
   * rejecting the whole batch (mirrors CalendarEngine.setSelectedDates()).
   */
  setSelectedDates(dates: Date[]): void {
    this._selectedDates.set(
      filterSelectedDates(dates, this.keyFnFor(this._granularity()), (date) => this.isDateDisabled(date)),
    );
  }

  /** Discards the in-progress Draft without touching selectedRange (Decision 3). */
  abortRangeDraft(): void {
    this._draftStart.set(null);
  }

  /** Clears the selection only — viewDate is deliberately left untouched. */
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
   * Programmatic single-item removal, multi mode only (mirrors
   * CalendarEngine.removeDate()). No-op when not present; throws in non-multi
   * modes — there is no meaningful "remove one from a non-collection" operation.
   */
  removeDate(date: Date): void {
    if (this._selectionMode() !== 'multi') {
      throw new Error('removeDate() is only valid in multi selection mode');
    }
    const key = this.keyFnFor(this._granularity())(date);
    const current = this._selectedDates();
    if (!current.has(key)) return;
    const next = new Map(current);
    next.delete(key);
    this._selectedDates.set(next);
  }

  /** Supports both direct queries (external, tests) and the engine's own I2 enforcement. */
  isDateDisabled(date: Date): boolean {
    const disabled = this._disabled();
    return disabled !== undefined && isDisabledByAny(date, disabled);
  }
}
