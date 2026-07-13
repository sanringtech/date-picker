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
});
