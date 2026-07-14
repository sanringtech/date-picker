import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { isSameDay } from 'date-fns/isSameDay';
import { isValid } from 'date-fns/isValid';
import { isDisabledByAny } from './calendar-disabled';
import { buildMonthGrid, GRID_SIZE } from './calendar-grid';
import { CALENDAR_LOCALE, CALENDAR_TODAY } from './calendar.tokens';
import type { CalendarDay, CalendarLocale, DateRange, DisabledInput } from './calendar.types';

/** M1 scope: no cross-month auto-transfer on arrow keys (Decision 6 lands in M4). */
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
 * M3 adds: range selection (Draft → commit / abort), clearSelection for range,
 * and I2 enforcement across both modes.  Multi-month grids and cross-month
 * keyboard auto-transfer land in M4 (.claude/prds/date-picker.md §10).
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

  /** Always a 1-element array in M1–M3; multi-month support arrives in M4 (Decision 8). */
  readonly monthGrids = computed<CalendarDay[][]>(() => {
    const locale = this.resolvedLocale();
    const mode = this._selectionMode();
    const selected = this._selectedDate();
    const range = this._selectedRange();
    const draftStart = this._draftStart();
    const focused = this._focusedDate();
    const today = this.todayFn();

    // Resolve the effective display range for range mode.
    // During Draft: draftStart + focusedDate as tentative end (Open Questions #5 resolved).
    // After commit: the stable selectedRange.
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
      // Normalise order so effectiveStart ≤ effectiveEnd regardless of pick order.
      if (effectiveStart !== null && effectiveEnd !== null) {
        if (dayMs(effectiveStart) > dayMs(effectiveEnd)) {
          [effectiveStart, effectiveEnd] = [effectiveEnd, effectiveStart];
        }
      }
    }

    const grid = buildMonthGrid(this._viewDate(), locale.weekStartsOn).map((cell): CalendarDay => {
      let isSelected = false;
      let isRangeStart = false;
      let isRangeEnd = false;
      let isInRange = false;

      if (mode === 'single') {
        isSelected = selected !== null && isSameDay(cell.date, selected);
      } else {
        // Grid cells are already day-normalised (R2), so cell.date.getTime() ≡ dayMs(cell.date).
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

    return [grid];
  });

  setLocale(locale: CalendarLocale | undefined): void {
    this._localeOverride.set(locale);
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

    const draftStart = this._draftStart();
    if (draftStart !== null && this.isDateDisabled(draftStart)) {
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
   * Moves keyboard focus (Decision 6, M1/M3 subset — see FocusMoveDirection).
   * Arrow keys / Home / End stay within the current 42-cell grid and clamp at
   * its edges (no auto-paging). PageUp/PageDown change month and carry focus
   * to the same day-of-month, clamped to the shorter month.
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
      const clampedDay = Math.min(dayOfMonth, daysInNewMonth);
      this._focusedDate.set(
        new Date(newViewDate.getFullYear(), newViewDate.getMonth(), clampedDay),
      );
      return;
    }

    const grid = this.monthGrids()[0];
    // In range mode _selectedDate is always null; fall back to today for the baseline.
    const baseline = this._focusedDate() ?? this._selectedDate() ?? this.todayFn();
    const baselineIndex = grid.findIndex((cell) => isSameDay(cell.date, baseline));
    const currentIndex = baselineIndex === -1 ? 0 : baselineIndex;

    let targetIndex: number;
    switch (direction) {
      case 'left':
        targetIndex = currentIndex - 1;
        break;
      case 'right':
        targetIndex = currentIndex + 1;
        break;
      case 'up':
        targetIndex = currentIndex - 7;
        break;
      case 'down':
        targetIndex = currentIndex + 7;
        break;
      case 'home':
        targetIndex = Math.floor(currentIndex / 7) * 7;
        break;
      case 'end':
        targetIndex = Math.floor(currentIndex / 7) * 7 + 6;
        break;
    }

    const clampedIndex = Math.min(Math.max(targetIndex, 0), GRID_SIZE - 1);
    this._focusedDate.set(grid[clampedIndex].date);
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
    const draftStart = this._draftStart();
    if (draftStart === null) {
      // First pick: enter Draft — selectedRange is deliberately NOT touched here,
      // so abortRangeDraft() never needs to roll back anything (Decision 3 design).
      this._draftStart.set(date);
    } else {
      // Second pick: commit, auto-sorting so start ≤ end regardless of pick order.
      if (dayMs(draftStart) <= dayMs(date)) {
        this._selectedRange.set({ start: draftStart, end: date });
      } else {
        this._selectedRange.set({ start: date, end: draftStart });
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
