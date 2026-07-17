import { TestBed } from '@angular/core/testing';
import { isSameDay } from 'date-fns/isSameDay';
import { CalendarEngine } from './calendar-engine';
import { CALENDAR_LOCALE, CALENDAR_TODAY } from './calendar.tokens';
import type { CalendarLocale } from './calendar.types';

const testLocale: CalendarLocale = {
  weekStartsOn: 1,
  weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
  monthLabels: [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ],
};

function createEngine(options: { today?: Date; withLocale?: boolean } = {}): CalendarEngine {
  const { today, withLocale = true } = options;
  TestBed.configureTestingModule({
    providers: [
      CalendarEngine,
      ...(withLocale ? [{ provide: CALENDAR_LOCALE, useValue: testLocale }] : []),
      ...(today ? [{ provide: CALENDAR_TODAY, useValue: () => today }] : []),
    ],
  });
  return TestBed.inject(CalendarEngine);
}

describe('CalendarEngine', () => {
  const fixedToday = new Date(2026, 1, 15); // Feb 2026

  it('produces exactly one 42-day grid (I3)', () => {
    const engine = createEngine({ today: fixedToday });
    const grids = engine.monthGrids();
    expect(grids).toHaveLength(1);
    expect(grids[0]).toHaveLength(42);
  });

  it('marks the CALENDAR_TODAY-injected date as isToday', () => {
    const engine = createEngine({ today: fixedToday });
    const grid = engine.monthGrids()[0];
    const todayCell = grid.find((cell) => isSameDay(cell.date, fixedToday));
    expect(todayCell?.isToday).toBe(true);
    expect(grid.filter((cell) => cell.isToday)).toHaveLength(1);
  });

  it('selectDate marks the matching cell isSelected and exposes it via selectedDate', () => {
    const engine = createEngine({ today: fixedToday });
    const target = new Date(2026, 1, 20);

    engine.selectDate(target);

    expect(engine.selectedDate()).not.toBeNull();
    expect(isSameDay(engine.selectedDate()!, target)).toBe(true);
    const grid = engine.monthGrids()[0];
    expect(grid.filter((cell) => cell.isSelected)).toHaveLength(1);
    expect(grid.find((cell) => isSameDay(cell.date, target))?.isSelected).toBe(true);
  });

  it('re-selecting the same date clears the selection when allowDeselect is true (default)', () => {
    const engine = createEngine({ today: fixedToday });
    const target = new Date(2026, 1, 20);

    engine.selectDate(target);
    engine.selectDate(target);

    expect(engine.selectedDate()).toBeNull();
  });

  it('re-selecting the same date keeps the selection when allowDeselect is false', () => {
    const engine = createEngine({ today: fixedToday });
    const target = new Date(2026, 1, 20);
    engine.setAllowDeselect(false);

    engine.selectDate(target);
    engine.selectDate(target);

    expect(engine.selectedDate()).not.toBeNull();
    expect(isSameDay(engine.selectedDate()!, target)).toBe(true);
  });

  it('clearSelection resets selectedDate but leaves viewDate untouched (§8)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.selectDate(new Date(2026, 1, 20));
    engine.nextMonth(); // viewDate now March 2026

    engine.clearSelection();

    expect(engine.selectedDate()).toBeNull();
    const currentMonthCells = engine.monthGrids()[0].filter((cell) => cell.isCurrentMonth);
    expect(currentMonthCells[0].date.getMonth()).toBe(2); // still March, not reset to Feb/today
  });

  it('setViewDate falls back to today when given an invalid date (I1)', () => {
    const engine = createEngine({ today: fixedToday });

    engine.setViewDate(new Date('not-a-date'));

    const currentMonthCells = engine.monthGrids()[0].filter((cell) => cell.isCurrentMonth);
    expect(currentMonthCells[0].date.getMonth()).toBe(fixedToday.getMonth());
    expect(currentMonthCells[0].date.getFullYear()).toBe(fixedToday.getFullYear());
  });

  it('nextMonth/prevMonth shift the rendered month by one, including year rollover', () => {
    const engine = createEngine({ today: new Date(2026, 11, 15) }); // December 2026

    engine.nextMonth();
    let currentMonthCells = engine.monthGrids()[0].filter((cell) => cell.isCurrentMonth);
    expect(currentMonthCells[0].date.getFullYear()).toBe(2027);
    expect(currentMonthCells[0].date.getMonth()).toBe(0); // January 2027

    engine.prevMonth();
    engine.prevMonth();
    currentMonthCells = engine.monthGrids()[0].filter((cell) => cell.isCurrentMonth);
    expect(currentMonthCells[0].date.getFullYear()).toBe(2026);
    expect(currentMonthCells[0].date.getMonth()).toBe(10); // November 2026
  });

  it('throws when reading monthGrids without a locale override or a CALENDAR_LOCALE provider (Decision 7)', () => {
    const engine = createEngine({ today: fixedToday, withLocale: false });
    expect(() => engine.monthGrids()).toThrow();
  });

  it('setLocale overrides even when no CALENDAR_LOCALE provider is registered', () => {
    const engine = createEngine({ today: fixedToday, withLocale: false });
    engine.setLocale(testLocale);

    expect(() => engine.monthGrids()).not.toThrow();
    expect(engine.monthGrids()[0]).toHaveLength(42);
  });

  it('isDateDisabled is false for everything until setDisabled is called', () => {
    const engine = createEngine({ today: fixedToday });
    expect(engine.isDateDisabled(new Date(2026, 1, 20))).toBe(false);
  });

  it('isDateDisabled reflects the matcher passed to setDisabled (R4 / Decision 5)', () => {
    const engine = createEngine({ today: fixedToday });
    const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
    const holiday = { from: new Date(2026, 0, 26), to: new Date(2026, 0, 30) };

    engine.setDisabled([isWeekend, holiday]);

    expect(engine.isDateDisabled(new Date(2026, 1, 14))).toBe(true); // Saturday
    expect(engine.isDateDisabled(new Date(2026, 0, 28))).toBe(true); // in holiday interval
    expect(engine.isDateDisabled(new Date(2026, 1, 16))).toBe(false); // plain Monday
  });

  it('isDateDisabled reverts to false once setDisabled(undefined) clears the matcher', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setDisabled(new Date(2026, 1, 20));
    expect(engine.isDateDisabled(new Date(2026, 1, 20))).toBe(true);

    engine.setDisabled(undefined);

    expect(engine.isDateDisabled(new Date(2026, 1, 20))).toBe(false);
  });

  it('monthGrids reflects setDisabled via each cell.isDisabled', () => {
    const engine = createEngine({ today: fixedToday }); // Feb 2026, weekStartsOn=1
    const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
    engine.setDisabled(isWeekend);

    const grid = engine.monthGrids()[0];
    const disabledCells = grid.filter((cell) => cell.isDisabled);
    expect(disabledCells.length).toBeGreaterThan(0);
    expect(
      disabledCells.every((cell) => cell.date.getDay() === 0 || cell.date.getDay() === 6),
    ).toBe(true);
  });

  it('selectDate is a no-op on a disabled date (I2)', () => {
    const engine = createEngine({ today: fixedToday });
    const target = new Date(2026, 1, 20);
    engine.setDisabled(target);

    engine.selectDate(target);

    expect(engine.selectedDate()).toBeNull();
  });

  it('setDisabled destroys an existing selection it now conflicts with, rather than masking it', () => {
    const engine = createEngine({ today: fixedToday });
    const target = new Date(2026, 1, 20);
    engine.selectDate(target);
    expect(engine.selectedDate()).not.toBeNull();

    engine.setDisabled(target); // developer retroactively disables the already-selected day

    expect(engine.selectedDate()).toBeNull();

    // no ghost state: lifting the restriction does not resurrect the old selection
    engine.setDisabled(undefined);
    expect(engine.selectedDate()).toBeNull();
  });

  it('setDisabled leaves an unrelated existing selection untouched', () => {
    const engine = createEngine({ today: fixedToday });
    const target = new Date(2026, 1, 20);
    engine.selectDate(target);

    engine.setDisabled(new Date(2026, 1, 21)); // disables a different day

    expect(engine.selectedDate()).not.toBeNull();
    expect(isSameDay(engine.selectedDate()!, target)).toBe(true);
  });

  // ── R7 / Decision 13: Programmatic Value Setting ───────────────────────────

  describe('setSelectedDate (R7 / Decision 13)', () => {
    it('writes the value directly, bypassing the interactive toggle', () => {
      const engine = createEngine({ today: fixedToday });
      const target = new Date(2026, 1, 20);

      engine.setSelectedDate(target);

      expect(isSameDay(engine.selectedDate()!, target)).toBe(true);
    });

    it('re-applying the same date twice stays idempotent (no toggle-off)', () => {
      const engine = createEngine({ today: fixedToday });
      const target = new Date(2026, 1, 20);

      engine.setSelectedDate(target);
      engine.setSelectedDate(target);

      expect(isSameDay(engine.selectedDate()!, target)).toBe(true);
    });

    it('silently rejects a disabled date, leaving the previous value untouched (I2)', () => {
      const engine = createEngine({ today: fixedToday });
      const previous = new Date(2026, 1, 5);
      const disabledTarget = new Date(2026, 1, 20);
      engine.setSelectedDate(previous);
      engine.setDisabled(disabledTarget);

      engine.setSelectedDate(disabledTarget);

      expect(isSameDay(engine.selectedDate()!, previous)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// M3: Range Selection (§4 / Decision 3 / §8)
// ---------------------------------------------------------------------------

describe('Range Selection (§4 / Decision 3)', () => {
  const fixedToday = new Date(2026, 1, 15); // Feb 15 2026

  it('isDraftActive starts false', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    expect(engine.isDraftActive()).toBe(false);
  });

  it('first selectDate in range mode enters Draft — isDraftActive true, selectedRange untouched', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');

    engine.selectDate(new Date(2026, 1, 10));

    expect(engine.isDraftActive()).toBe(true);
    expect(engine.selectedRange()).toEqual({ start: null, end: null });
    expect(isSameDay(engine.draftStart()!, new Date(2026, 1, 10))).toBe(true);
  });

  it('second selectDate commits the range and exits Draft', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');

    engine.selectDate(new Date(2026, 1, 10));
    engine.selectDate(new Date(2026, 1, 20));

    expect(engine.isDraftActive()).toBe(false);
    expect(engine.draftStart()).toBeNull();
    expect(isSameDay(engine.selectedRange().start!, new Date(2026, 1, 10))).toBe(true);
    expect(isSameDay(engine.selectedRange().end!, new Date(2026, 1, 20))).toBe(true);
  });

  it('committed range auto-sorts: picking end before start swaps so start ≤ end', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');

    engine.selectDate(new Date(2026, 1, 20)); // later first
    engine.selectDate(new Date(2026, 1, 10)); // earlier second

    expect(isSameDay(engine.selectedRange().start!, new Date(2026, 1, 10))).toBe(true);
    expect(isSameDay(engine.selectedRange().end!, new Date(2026, 1, 20))).toBe(true);
  });

  it('abortRangeDraft clears draft and leaves selectedRange unchanged (Decision 3)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    // Commit a range first to have a non-empty stable value.
    engine.selectDate(new Date(2026, 1, 5));
    engine.selectDate(new Date(2026, 1, 10));
    const stableRange = engine.selectedRange();

    // Start a new draft, then abort.
    engine.selectDate(new Date(2026, 1, 15));
    expect(engine.isDraftActive()).toBe(true);

    engine.abortRangeDraft();

    expect(engine.isDraftActive()).toBe(false);
    expect(engine.draftStart()).toBeNull();
    // selectedRange must be the stable value from before the draft started.
    expect(isSameDay(engine.selectedRange().start!, stableRange.start!)).toBe(true);
    expect(isSameDay(engine.selectedRange().end!, stableRange.end!)).toBe(true);
  });

  it('abortRangeDraft on an idle engine is a no-op', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');

    expect(() => engine.abortRangeDraft()).not.toThrow();
    expect(engine.isDraftActive()).toBe(false);
  });

  it('clearSelection in range mode resets range and aborts draft, viewDate unchanged (§8)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    engine.selectDate(new Date(2026, 1, 5));
    engine.selectDate(new Date(2026, 1, 10));
    engine.nextMonth(); // advance viewDate to March
    engine.selectDate(new Date(2026, 2, 1)); // start a new draft

    engine.clearSelection();

    expect(engine.selectedRange()).toEqual({ start: null, end: null });
    expect(engine.isDraftActive()).toBe(false);
    // viewDate still March (§8: clearSelection must not reset viewDate).
    const currentMonthCells = engine.monthGrids()[0].filter((cell) => cell.isCurrentMonth);
    expect(currentMonthCells[0].date.getMonth()).toBe(2);
  });

  it('monthGrids marks isRangeStart and isRangeEnd on committed endpoints', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    const start = new Date(2026, 1, 10);
    const end = new Date(2026, 1, 20);

    engine.selectDate(start);
    engine.selectDate(end);

    const grid = engine.monthGrids()[0];
    const startCell = grid.find((c) => isSameDay(c.date, start))!;
    const endCell = grid.find((c) => isSameDay(c.date, end))!;

    expect(startCell.isRangeStart).toBe(true);
    expect(startCell.isSelected).toBe(true);
    expect(startCell.isRangeEnd).toBe(false);
    expect(endCell.isRangeEnd).toBe(true);
    expect(endCell.isSelected).toBe(true);
    expect(endCell.isRangeStart).toBe(false);
  });

  it('monthGrids marks isInRange strictly between committed endpoints (endpoints excluded)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');

    engine.selectDate(new Date(2026, 1, 10));
    engine.selectDate(new Date(2026, 1, 20));

    const grid = engine.monthGrids()[0];
    const midCell = grid.find((c) => isSameDay(c.date, new Date(2026, 1, 15)))!;
    const beforeCell = grid.find((c) => isSameDay(c.date, new Date(2026, 1, 9)))!;
    const afterCell = grid.find((c) => isSameDay(c.date, new Date(2026, 1, 21)))!;

    expect(midCell.isInRange).toBe(true);
    expect(midCell.isRangeStart).toBe(false);
    expect(midCell.isRangeEnd).toBe(false);
    expect(beforeCell.isInRange).toBe(false);
    expect(afterCell.isInRange).toBe(false);
  });

  it('draft preview: only isRangeStart shown when focusedDate is null', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    const start = new Date(2026, 1, 10);

    engine.selectDate(start);

    expect(engine.isDraftActive()).toBe(true);
    const grid = engine.monthGrids()[0];
    const startCell = grid.find((c) => isSameDay(c.date, start))!;
    expect(startCell.isRangeStart).toBe(true);
    expect(startCell.isSelected).toBe(true);
    // No tentative end because focusedDate is null.
    expect(grid.every((c) => !c.isRangeEnd)).toBe(true);
    expect(grid.every((c) => !c.isInRange)).toBe(true);
  });

  it('draft preview: focusedDate acts as tentative range end (Open Questions #5)', () => {
    const engine = createEngine({ today: fixedToday }); // today = Feb 15
    engine.setSelectionMode('range');
    const start = new Date(2026, 1, 10);

    engine.selectDate(start); // enter Draft
    // moveFocus with no prior focusedDate falls back to today (Feb 15), then right → Feb 16.
    engine.moveFocus('right');
    const tentativeEnd = engine.focusedDate()!;

    expect(engine.isDraftActive()).toBe(true);
    expect(tentativeEnd).not.toBeNull();

    const grid = engine.monthGrids()[0];
    const startCell = grid.find((c) => isSameDay(c.date, start))!;
    const endCell = grid.find((c) => isSameDay(c.date, tentativeEnd))!;

    expect(startCell.isRangeStart).toBe(true);
    expect(endCell.isRangeEnd).toBe(true);
    expect(endCell.isSelected).toBe(true);

    // Days strictly between start (Feb 10) and tentativeEnd (Feb 16) should be isInRange.
    const inRangeCell = grid.find((c) => isSameDay(c.date, new Date(2026, 1, 13)))!;
    expect(inRangeCell.isInRange).toBe(true);
  });

  it('draft preview auto-sorts when focusedDate is before draftStart', () => {
    const engine = createEngine({ today: fixedToday }); // today = Feb 15
    engine.setSelectionMode('range');

    engine.selectDate(new Date(2026, 1, 20)); // draftStart = Feb 20
    engine.moveFocus('left'); // focusedDate → Feb 14 (today - 1)

    const grid = engine.monthGrids()[0];
    const focusedDate = engine.focusedDate()!;
    // After sort: focusedDate should be treated as start, draftStart as end.
    const tentativeStartCell = grid.find((c) => isSameDay(c.date, focusedDate))!;
    const tentativeEndCell = grid.find((c) => isSameDay(c.date, new Date(2026, 1, 20)))!;

    expect(tentativeStartCell.isRangeStart).toBe(true);
    expect(tentativeEndCell.isRangeEnd).toBe(true);
  });

  it('selectDate is a no-op on a disabled date in range mode (I2)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    const saturday = new Date(2026, 1, 14);
    engine.setDisabled((d) => d.getDay() === 6);

    engine.selectDate(saturday);

    expect(engine.isDraftActive()).toBe(false);
    expect(engine.selectedRange()).toEqual({ start: null, end: null });
  });

  it('setDisabled destroys a committed range whose start is now disabled (I2 range)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    engine.selectDate(new Date(2026, 1, 10));
    engine.selectDate(new Date(2026, 1, 20));

    engine.setDisabled(new Date(2026, 1, 10)); // retroactively disables the range start

    expect(engine.selectedRange()).toEqual({ start: null, end: null });
  });

  it('setDisabled destroys a committed range whose end is now disabled (I2 range)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    engine.selectDate(new Date(2026, 1, 10));
    engine.selectDate(new Date(2026, 1, 20));

    engine.setDisabled(new Date(2026, 1, 20)); // retroactively disables the range end

    expect(engine.selectedRange()).toEqual({ start: null, end: null });
  });

  it('setDisabled aborts an active draft whose start is now disabled', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionMode('range');
    engine.selectDate(new Date(2026, 1, 10)); // enter Draft

    engine.setDisabled(new Date(2026, 1, 10));

    expect(engine.isDraftActive()).toBe(false);
    expect(engine.draftStart()).toBeNull();
  });

  it('no single-mode state bleeds into range mode after setSelectionMode (no ghost state)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.selectDate(new Date(2026, 1, 20)); // single selection

    engine.setSelectionMode('range'); // switch resets everything

    expect(engine.selectedDate()).toBeNull();
    expect(engine.selectedRange()).toEqual({ start: null, end: null });
    expect(engine.isDraftActive()).toBe(false);
  });

  // ── M4: Multi-month grid (Decision 8) ──────────────────────────────────────

  describe('Multi-month grid (Decision 8)', () => {
    it('setMonthsToDisplay(2) produces two 42-cell grids', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setMonthsToDisplay(2);
      const grids = engine.monthGrids();
      expect(grids).toHaveLength(2);
      expect(grids[0]).toHaveLength(42);
      expect(grids[1]).toHaveLength(42);
    });

    it('second grid offset is one month ahead of the first', () => {
      const engine = createEngine({ today: fixedToday }); // view = Feb 2026
      engine.setMonthsToDisplay(2);
      const [feb, mar] = engine.monthGrids();
      const febCurrent = feb.filter((d) => d.isCurrentMonth);
      const marCurrent = mar.filter((d) => d.isCurrentMonth);
      expect(febCurrent[0].date.getMonth()).toBe(1); // February
      expect(marCurrent[0].date.getMonth()).toBe(2); // March
    });

    it('setMonthsToDisplay clamps minimum to 1', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setMonthsToDisplay(0);
      expect(engine.monthGrids()).toHaveLength(1);
    });

    it('nextMonth() always slides by exactly one month regardless of monthsToDisplay', () => {
      const engine = createEngine({ today: fixedToday }); // view = Feb 2026
      engine.setMonthsToDisplay(2);
      engine.nextMonth();
      const grids = engine.monthGrids();
      const firstCurrent = grids[0].filter((d) => d.isCurrentMonth);
      expect(firstCurrent[0].date.getMonth()).toBe(2); // March now leads
    });
  });

  // ── M4: Cross-month focus auto-transfer (Decision 6) ───────────────────────

  describe('Cross-month focus auto-transfer (Decision 6)', () => {
    it('ArrowLeft from the first cell of the grid transfers to the previous month', () => {
      const engine = createEngine({ today: fixedToday }); // Feb 2026
      // Feb grid (weekStartsOn=1) starts Mon Jan 26. moveFocus('left') from flat
      // index 0 will land at flat -1 → prevMonth() → Jan grid cell 41.
      engine.moveFocus('left'); // baseline = today (Feb 15, flat 20) → Feb 14
      // navigate all the way to flat 0 (Jan 26 2026 in Feb grid)
      for (let i = 0; i < 19; i++) engine.moveFocus('left');
      // now at flat index 0; one more left crosses the boundary
      engine.moveFocus('left');

      const grids = engine.monthGrids();
      const currentMonthCells = grids[0].filter((d) => d.isCurrentMonth);
      expect(currentMonthCells[0].date.getMonth()).toBe(0); // January now visible
      expect(engine.focusedDate()).not.toBeNull();
    });

    it('ArrowRight from the last cell of the grid transfers to the next month', () => {
      const engine = createEngine({ today: fixedToday }); // Feb 2026
      // Feb grid last cell (index 41) is Sun Mar 8. One right from there → March
      // grid, flat index 0.  Navigate right 21 steps from Feb 15 (flat 20) to
      // reach flat 41, then one more.
      for (let i = 0; i < 22; i++) engine.moveFocus('right'); // 21 steps to flat 41, +1 crosses

      const grids = engine.monthGrids();
      const currentMonthCells = grids[0].filter((d) => d.isCurrentMonth);
      expect(currentMonthCells[0].date.getMonth()).toBe(2); // March now visible
    });

    it('Home and End never cross a month boundary', () => {
      const engine = createEngine({ today: fixedToday }); // Feb 15 = Sun, last in its week row
      engine.moveFocus('home'); // should land on Mon Feb 9 (row-start, still February)
      let focused = engine.focusedDate()!;
      expect(focused.getMonth()).toBe(1); // still February
      expect(focused.getDate()).toBe(9);

      engine.moveFocus('end'); // Sun Feb 15
      focused = engine.focusedDate()!;
      expect(focused.getMonth()).toBe(1);
      expect(focused.getDate()).toBe(15);
    });

    it('PageDown carries focus to the same day-of-month in the next month', () => {
      const engine = createEngine({ today: fixedToday }); // Feb 2026
      engine.moveFocus('right'); // focus Feb 16
      engine.moveFocus('pagedown'); // → March 16
      const focused = engine.focusedDate()!;
      expect(focused.getMonth()).toBe(2); // March
      expect(focused.getDate()).toBe(16);
    });

    it('PageUp clamps focus to the last day when the target month is shorter', () => {
      const engine = createEngine({ today: new Date(2026, 2, 31) }); // Mar 31
      engine.moveFocus('left'); // set focusedDate to Mar 30
      engine.moveFocus('pageup'); // target Feb 30 → clamped to Feb 28
      const focused = engine.focusedDate()!;
      expect(focused.getMonth()).toBe(1); // February
      expect(focused.getDate()).toBe(28);
    });

    it('multi-month: ArrowRight within visible window does not page prematurely', () => {
      const engine = createEngine({ today: fixedToday }); // Feb 2026
      engine.setMonthsToDisplay(2); // Feb + Mar visible
      // Feb 15 is at flat 20 in 84-cell window. ArrowRight 22 times lands at flat 42,
      // which is cell 0 of Mar grid — still within window, no paging.
      for (let i = 0; i < 22; i++) engine.moveFocus('right');
      const grids = engine.monthGrids();
      // window must still start at February (no paging triggered)
      const firstCurrent = grids[0].filter((d) => d.isCurrentMonth);
      expect(firstCurrent[0].date.getMonth()).toBe(1); // still February leads
    });
  });

  // ── R7 / Decision 13: setSelectedRange ─────────────────────────────────────

  describe('setSelectedRange (R7 / Decision 13)', () => {
    it('writes a valid range directly, bypassing Draft entirely', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');

      engine.setSelectedRange({ start: new Date(2026, 1, 10), end: new Date(2026, 1, 20) });

      expect(engine.isDraftActive()).toBe(false);
      expect(isSameDay(engine.selectedRange().start!, new Date(2026, 1, 10))).toBe(true);
      expect(isSameDay(engine.selectedRange().end!, new Date(2026, 1, 20))).toBe(true);
    });

    it('normalises reversed start/end order', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');

      engine.setSelectedRange({ start: new Date(2026, 1, 20), end: new Date(2026, 1, 10) });

      expect(isSameDay(engine.selectedRange().start!, new Date(2026, 1, 10))).toBe(true);
      expect(isSameDay(engine.selectedRange().end!, new Date(2026, 1, 20))).toBe(true);
    });

    it('clears an in-progress draft (no ghost draft left behind)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.selectDate(new Date(2026, 1, 5)); // enters Draft

      engine.setSelectedRange({ start: new Date(2026, 1, 10), end: new Date(2026, 1, 20) });

      expect(engine.isDraftActive()).toBe(false);
      expect(engine.draftStart()).toBeNull();
    });

    it('{start: null, end: null} clears the selection like clearSelection()', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.setSelectedRange({ start: new Date(2026, 1, 10), end: new Date(2026, 1, 20) });

      engine.setSelectedRange({ start: null, end: null });

      expect(engine.selectedRange()).toEqual({ start: null, end: null });
    });

    it('rejects a half-specified range, leaving the previous value untouched', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.setSelectedRange({ start: new Date(2026, 1, 10), end: new Date(2026, 1, 20) });

      engine.setSelectedRange({ start: new Date(2026, 1, 1), end: null });

      expect(isSameDay(engine.selectedRange().start!, new Date(2026, 1, 10))).toBe(true);
    });

    it('rejects the whole write when either endpoint is disabled (I2)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.setDisabled(new Date(2026, 1, 20));

      engine.setSelectedRange({ start: new Date(2026, 1, 10), end: new Date(2026, 1, 20) });

      expect(engine.selectedRange()).toEqual({ start: null, end: null });
    });
  });

  // ── R8 / Decision 14: Range day-count limit ────────────────────────────────

  describe('Range day-count limit (R8 / Decision 14)', () => {
    it('is unbounded by default', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');

      engine.selectDate(new Date(2026, 1, 1));
      engine.selectDate(new Date(2026, 5, 1)); // a huge span

      expect(engine.isDraftActive()).toBe(false);
      expect(engine.selectedRange().start).not.toBeNull();
    });

    it('day count is inclusive of both endpoints (Jul 1 → Jul 3 = 3 days)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.setRangeDayCountLimit({ maxDays: 3 });

      engine.selectDate(new Date(2026, 6, 1));
      engine.selectDate(new Date(2026, 6, 3)); // exactly at the 3-day boundary

      expect(engine.isDraftActive()).toBe(false);
      expect(isSameDay(engine.selectedRange().end!, new Date(2026, 6, 3))).toBe(true);
    });

    it('selectDate rejects an endpoint that exceeds maxDays, keeping the draft open', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.setRangeDayCountLimit({ maxDays: 3 });

      engine.selectDate(new Date(2026, 6, 1)); // draft start
      engine.selectDate(new Date(2026, 6, 4)); // 4 days — exceeds limit

      expect(engine.isDraftActive()).toBe(true);
      expect(isSameDay(engine.draftStart()!, new Date(2026, 6, 1))).toBe(true);
      expect(engine.selectedRange()).toEqual({ start: null, end: null });
    });

    it('selectDate rejects an endpoint below minDays', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.setRangeDayCountLimit({ minDays: 3 });

      engine.selectDate(new Date(2026, 6, 1));
      engine.selectDate(new Date(2026, 6, 2)); // only 2 days — below minimum

      expect(engine.isDraftActive()).toBe(true);
      expect(engine.selectedRange()).toEqual({ start: null, end: null });
    });

    it('setSelectedRange rejects a write that violates the configured limit', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.setRangeDayCountLimit({ maxDays: 3 });

      engine.setSelectedRange({ start: new Date(2026, 6, 1), end: new Date(2026, 6, 10) });

      expect(engine.selectedRange()).toEqual({ start: null, end: null });
    });

    it('setRangeDayCountLimit proactively clears an already-committed range it now violates', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.selectDate(new Date(2026, 6, 1));
      engine.selectDate(new Date(2026, 6, 10)); // 10-day range, committed while unbounded

      engine.setRangeDayCountLimit({ maxDays: 3 });

      expect(engine.selectedRange()).toEqual({ start: null, end: null });
    });

    it('setRangeDayCountLimit leaves a still-valid committed range untouched', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('range');
      engine.selectDate(new Date(2026, 6, 1));
      engine.selectDate(new Date(2026, 6, 2)); // 2-day range

      engine.setRangeDayCountLimit({ maxDays: 3 });

      expect(isSameDay(engine.selectedRange().start!, new Date(2026, 6, 1))).toBe(true);
      expect(isSameDay(engine.selectedRange().end!, new Date(2026, 6, 2))).toBe(true);
    });
  });

  describe('Multi-dates Selection (M6 / Decision 11 / I6)', () => {
    it('selectedDates is empty by default', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      expect(engine.selectedDates()).toEqual([]);
    });

    it('selectDate accumulates non-contiguous dates', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      const d1 = new Date(2026, 1, 10);
      const d2 = new Date(2026, 1, 20);
      engine.selectDate(d1);
      engine.selectDate(d2);
      expect(engine.selectedDates()).toHaveLength(2);
      expect(engine.selectedDates().some((d) => isSameDay(d, d1))).toBe(true);
      expect(engine.selectedDates().some((d) => isSameDay(d, d2))).toBe(true);
    });

    it('selectDate on an already-selected date removes it (toggle, Decision 11)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      const d = new Date(2026, 1, 10);
      engine.selectDate(d);
      engine.selectDate(d);
      expect(engine.selectedDates()).toHaveLength(0);
    });

    it('toggle removal is NOT gated by allowDeselect (Decision 11 decoupling)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      engine.setAllowDeselect(false);
      const d = new Date(2026, 1, 10);
      engine.selectDate(d);
      engine.selectDate(d); // should still toggle off
      expect(engine.selectedDates()).toHaveLength(0);
    });

    it('isSelected is true for all selected dates in the grid', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      const d1 = new Date(2026, 1, 10);
      const d2 = new Date(2026, 1, 20);
      engine.selectDate(d1);
      engine.selectDate(d2);
      const grid = engine.monthGrids()[0];
      expect(grid.find((c) => isSameDay(c.date, d1))?.isSelected).toBe(true);
      expect(grid.find((c) => isSameDay(c.date, d2))?.isSelected).toBe(true);
    });

    it('selectDate is a no-op on a disabled date in multi mode (I2)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      const d = new Date(2026, 1, 10);
      engine.setDisabled(d);
      engine.selectDate(d);
      expect(engine.selectedDates()).toHaveLength(0);
    });

    it('clearSelection empties all selected dates', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      engine.selectDate(new Date(2026, 1, 10));
      engine.selectDate(new Date(2026, 1, 20));
      engine.clearSelection();
      expect(engine.selectedDates()).toHaveLength(0);
    });

    it('setSelectionMode resets selectedDates when switching away from multi', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      engine.selectDate(new Date(2026, 1, 10));
      engine.setSelectionMode('single');
      expect(engine.selectedDates()).toHaveLength(0);
    });

    it('setSelectionMode from single/range to multi resets prior selection', () => {
      const engine = createEngine({ today: fixedToday });
      engine.selectDate(new Date(2026, 1, 10));
      engine.setSelectionMode('multi');
      expect(engine.selectedDate()).toBeNull();
      expect(engine.selectedDates()).toHaveLength(0);
    });

    it('removeDate removes an existing date from the collection', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      const d1 = new Date(2026, 1, 10);
      const d2 = new Date(2026, 1, 20);
      engine.selectDate(d1);
      engine.selectDate(d2);
      engine.removeDate(d1);
      expect(engine.selectedDates()).toHaveLength(1);
      expect(engine.selectedDates().some((d) => isSameDay(d, d2))).toBe(true);
    });

    it('removeDate is a no-op for a date not in the collection', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      engine.selectDate(new Date(2026, 1, 10));
      expect(() => engine.removeDate(new Date(2026, 1, 20))).not.toThrow();
      expect(engine.selectedDates()).toHaveLength(1);
    });

    it('removeDate throws when called outside multi mode', () => {
      const engine = createEngine({ today: fixedToday });
      expect(() => engine.removeDate(new Date(2026, 1, 10))).toThrow();
    });

    it('setSelectedDates writes multiple dates programmatically (R7)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      const dates = [new Date(2026, 1, 5), new Date(2026, 1, 15), new Date(2026, 1, 25)];
      engine.setSelectedDates(dates);
      expect(engine.selectedDates()).toHaveLength(3);
    });

    it('setSelectedDates silently drops disabled dates (I2 / R7)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      const disabled = new Date(2026, 1, 15);
      engine.setDisabled(disabled);
      engine.setSelectedDates([new Date(2026, 1, 5), disabled, new Date(2026, 1, 25)]);
      expect(engine.selectedDates()).toHaveLength(2);
      expect(engine.selectedDates().some((d) => isSameDay(d, disabled))).toBe(false);
    });

    it('setSelectedDates deduplicates same calendar day', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      engine.setSelectedDates([new Date(2026, 1, 10), new Date(2026, 1, 10)]);
      expect(engine.selectedDates()).toHaveLength(1);
    });

    it('setDisabled removes newly-disabled dates from selectedDates (I2)', () => {
      const engine = createEngine({ today: fixedToday });
      engine.setSelectionMode('multi');
      const d1 = new Date(2026, 1, 10);
      const d2 = new Date(2026, 1, 20);
      engine.selectDate(d1);
      engine.selectDate(d2);
      engine.setDisabled(d1);
      expect(engine.selectedDates()).toHaveLength(1);
      expect(engine.selectedDates().some((d) => isSameDay(d, d2))).toBe(true);
    });
  });
});
