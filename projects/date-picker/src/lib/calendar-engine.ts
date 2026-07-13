import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { isSameDay } from 'date-fns/isSameDay';
import { isValid } from 'date-fns/isValid';
import { isDisabledByAny } from './calendar-disabled';
import { buildMonthGrid, GRID_SIZE } from './calendar-grid';
import { CALENDAR_LOCALE, CALENDAR_TODAY } from './calendar.tokens';
import type { CalendarDay, CalendarLocale, DisabledInput } from './calendar.types';

/** M1 scope: no cross-month auto-transfer on arrow keys (Decision 6 lands in M4). */
export type FocusMoveDirection =
  'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'pageup' | 'pagedown';

/**
 * Headless calendar state machine. M1 tracer-bullet scope: single-date
 * selection over one month's 42-day grid. Range selection, disabled dates,
 * multi-month grids, and keyboard focus land in later milestones
 * (.claude/prds/date-picker.md §10).
 *
 * Component-scoped: provide this per calendar instance (`providers: [CalendarEngine]`),
 * not `providedIn: 'root'` — two pickers on the same page must not share state.
 */
@Injectable()
export class CalendarEngine {
  private readonly injector = inject(Injector);
  private readonly todayFn = inject(CALENDAR_TODAY);

  private readonly _viewDate = signal<Date>(this.todayFn());
  private readonly _selectedDate = signal<Date | null>(null);
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
  readonly focusedDate = this._focusedDate.asReadonly();

  /** Always a 1-element array in M1; multi-month support arrives in M4 (Decision 8). */
  readonly monthGrids = computed<CalendarDay[][]>(() => {
    const locale = this.resolvedLocale();
    const selected = this._selectedDate();
    const focused = this._focusedDate();
    const today = this.todayFn();

    const grid = buildMonthGrid(this._viewDate(), locale.weekStartsOn).map((cell): CalendarDay => ({
      date: cell.date,
      isCurrentMonth: cell.isCurrentMonth,
      isToday: isSameDay(cell.date, today),
      isSelected: selected !== null && isSameDay(cell.date, selected),
      isRangeStart: false,
      isRangeEnd: false,
      isInRange: false,
      isDisabled: this.isDateDisabled(cell.date),
      isFocused: focused !== null && isSameDay(cell.date, focused),
    }));

    return [grid];
  });

  setLocale(locale: CalendarLocale | undefined): void {
    this._localeOverride.set(locale);
  }

  /** Whether re-selecting the already-selected date clears it (constitution §4). */
  setAllowDeselect(allow: boolean): void {
    this._allowDeselect.set(allow);
  }

  /**
   * Unified disabled-date matcher — single day / array / interval / predicate,
   * OR-combined (R4 / Decision 5). If the currently selected date is caught
   * by the new matcher, the selection is destroyed outright (not masked) —
   * no ghost state, same discipline as Decision 3's Range-abort policy.
   */
  setDisabled(input: DisabledInput | undefined): void {
    this._disabled.set(input);

    const selected = this._selectedDate();
    if (selected !== null && this.isDateDisabled(selected)) {
      this._selectedDate.set(null);
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
   * Moves keyboard focus (Decision 6, M1 subset — see FocusMoveDirection).
   * up/down/left/right/home/end stay within the current 42-cell grid and
   * clamp at its edges (no auto-paging). pageup/pagedown explicitly change
   * month and carry focus to the same day-of-month, clamped to the shorter month.
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
   * unselected -> selected on any valid pick; selected -> unselected only when
   * the same date is re-picked AND allowDeselect is true, otherwise it holds.
   * A disabled date is always a no-op (I2: Selected ∩ Disabled = Ø).
   */
  selectDate(date: Date): void {
    if (this.isDateDisabled(date)) {
      return;
    }

    const current = this._selectedDate();
    if (current !== null && isSameDay(current, date)) {
      if (this._allowDeselect()) {
        this._selectedDate.set(null);
      }
      return;
    }
    this._selectedDate.set(date);
  }

  /** §8: clears the selection only — viewDate is deliberately left untouched. */
  clearSelection(): void {
    this._selectedDate.set(null);
  }

  /** Supports both direct queries (external, tests) and the engine's own I2 enforcement (M2). */
  isDateDisabled(date: Date): boolean {
    const disabled = this._disabled();
    return disabled !== undefined && isDisabledByAny(date, disabled);
  }
}
