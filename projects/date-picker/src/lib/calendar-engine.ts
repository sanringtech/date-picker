import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { isSameDay } from 'date-fns/isSameDay';
import { isValid } from 'date-fns/isValid';
import { isDisabledByAny } from './calendar-disabled';
import { buildMonthGrid, GRID_SIZE } from './calendar-grid';
import { CALENDAR_LOCALE, CALENDAR_TODAY } from './calendar.tokens';
import type { CalendarDay, CalendarLocale, DateRange, DisabledInput } from './calendar.types';

/** Full set of focus-movement directions exposed by CalendarEngine.moveFocus(). */
export type FocusMoveDirection =
  'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'pageup' | 'pagedown';

/** Normalises a Date to midnight for day-level range comparisons. */
function dayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
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
  private readonly _selectionMode = signal<'single' | 'range'>('single');
  private readonly _monthsToDisplay = signal<number>(1);
  private readonly _selectedDate = signal<Date | null>(null);
  private readonly _selectedRange = signal<DateRange>(EMPTY_RANGE);
  private readonly _draftStart = signal<Date | null>(null);
  private readonly _focusedDate = signal<Date | null>(null);
  private readonly _allowDeselect = signal(true);
  private readonly _localeOverride = signal<CalendarLocale | undefined>(undefined);
  private readonly _disabled = signal<DisabledInput | undefined>(undefined);

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

  /** Switches selection mode and resets all selection state to avoid cross-mode leakage. */
  setSelectionMode(mode: 'single' | 'range'): void {
    this._selectionMode.set(mode);
    this._selectedDate.set(null);
    this._selectedRange.set(EMPTY_RANGE);
    this._draftStart.set(null);
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
   * Multi-month (Decision 8): the visible window is N × 42 cells; the
   * flat-index calculation spans all N grids before triggering a page.
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

    const grids = this.monthGrids();
    const baseline = this._focusedDate() ?? this._selectedDate() ?? this.todayFn();

    // Locate baseline across all visible grids.
    let baselineG = 0;
    let baselineC = 0;
    search:
    for (let g = 0; g < grids.length; g++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (isSameDay(grids[g][c].date, baseline)) {
          baselineG = g;
          baselineC = c;
          break search;
        }
      }
    }

    // Home/End: move within the SAME grid's week row, never cross a month.
    if (direction === 'home') {
      this._focusedDate.set(grids[baselineG][Math.floor(baselineC / 7) * 7].date);
      return;
    }
    if (direction === 'end') {
      this._focusedDate.set(grids[baselineG][Math.floor(baselineC / 7) * 7 + 6].date);
      return;
    }

    // Flat index across the full N-month visible window.
    const currentFlat = baselineG * GRID_SIZE + baselineC;
    const totalCells = grids.length * GRID_SIZE;

    // Definite assignment: initialize to currentFlat as an unreachable fallback
    // (home/end/pageup/pagedown all returned above; this covers TypeScript's
    // control-flow analysis which can't see that).
    let targetFlat = currentFlat;
    switch (direction) {
      case 'left':  targetFlat = currentFlat - 1; break;
      case 'right': targetFlat = currentFlat + 1; break;
      case 'up':    targetFlat = currentFlat - 7; break;
      case 'down':  targetFlat = currentFlat + 7; break;
    }

    if (targetFlat < 0) {
      // Cross-month: slide window back one month, land on the corresponding cell.
      this.prevMonth();
      const newGrids = this.monthGrids();
      const newFlat = newGrids.length * GRID_SIZE + targetFlat;
      this._focusedDate.set(newGrids[Math.floor(newFlat / GRID_SIZE)][newFlat % GRID_SIZE].date);
    } else if (targetFlat >= totalCells) {
      // Cross-month: slide window forward one month.
      this.nextMonth();
      const newGrids = this.monthGrids();
      const newFlat = targetFlat - totalCells;
      this._focusedDate.set(newGrids[Math.floor(newFlat / GRID_SIZE)][newFlat % GRID_SIZE].date);
    } else {
      this._focusedDate.set(grids[Math.floor(targetFlat / GRID_SIZE)][targetFlat % GRID_SIZE].date);
    }
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

    if (this._selectionMode() === 'single') {
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

    // Range mode
    const ds = this._draftStart();
    if (ds === null) {
      this._draftStart.set(date);
    } else {
      if (dayMs(ds) <= dayMs(date)) {
        this._selectedRange.set({ start: ds, end: date });
      } else {
        this._selectedRange.set({ start: date, end: ds });
      }
      this._draftStart.set(null);
    }
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
    if (this._selectionMode() === 'single') {
      this._selectedDate.set(null);
    } else {
      this._selectedRange.set(EMPTY_RANGE);
      this._draftStart.set(null);
    }
  }

  /** Supports both direct queries (external, tests) and the engine's own I2 enforcement. */
  isDateDisabled(date: Date): boolean {
    const disabled = this._disabled();
    return disabled !== undefined && isDisabledByAny(date, disabled);
  }
}
