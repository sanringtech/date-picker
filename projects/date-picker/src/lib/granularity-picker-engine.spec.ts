import { TestBed } from '@angular/core/testing';
import { isSameMonth } from 'date-fns/isSameMonth';
import { GranularityPickerEngine } from './granularity-picker-engine';
import { CALENDAR_QUARTER_STARTS_ON, CALENDAR_TODAY } from './calendar.tokens';

function createEngine(options: { today?: Date; quarterStartMonth?: number } = {}): GranularityPickerEngine {
  const { today, quarterStartMonth } = options;
  TestBed.configureTestingModule({
    providers: [
      GranularityPickerEngine,
      ...(today ? [{ provide: CALENDAR_TODAY, useValue: () => today }] : []),
      ...(quarterStartMonth !== undefined
        ? [{ provide: CALENDAR_QUARTER_STARTS_ON, useValue: quarterStartMonth }]
        : []),
    ],
  });
  return TestBed.inject(GranularityPickerEngine);
}

describe('GranularityPickerEngine — grid sizes (R6)', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('month granularity produces exactly 12 cells', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    expect(engine.granularityGrids()).toHaveLength(12);
  });

  it('quarter granularity produces exactly 4 cells', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 0 });
    engine.setSelectionGranularity('quarter');
    expect(engine.granularityGrids()).toHaveLength(4);
  });

  it('year granularity produces `yearsToDisplay` cells (default 12)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    expect(engine.granularityGrids()).toHaveLength(12);
    engine.setYearsToDisplay(5);
    expect(engine.granularityGrids()).toHaveLength(5);
  });

  it('setYearsToDisplay clamps below 1 up to 1', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setYearsToDisplay(0);
    expect(engine.granularityGrids()).toHaveLength(1);
  });
});

describe('GranularityPickerEngine — CALENDAR_QUARTER_STARTS_ON zero-default (ADR-0001)', () => {
  it('throws when quarter granularity is used without the token provided', () => {
    const engine = createEngine({ today: new Date(2026, 5, 15) }); // no quarterStartMonth provider
    engine.setSelectionGranularity('quarter');
    expect(() => engine.granularityGrids()).toThrow();
  });

  it('does not throw for month/year granularity without the token', () => {
    const engine = createEngine({ today: new Date(2026, 5, 15) });
    engine.setSelectionGranularity('month');
    expect(() => engine.granularityGrids()).not.toThrow();
  });
});

describe('GranularityPickerEngine — single selection (month granularity)', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('selectDate marks the matching month cell isSelected', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    const target = new Date(2026, 3, 20); // picked mid-month, cell anchor is the 1st

    engine.selectDate(target);

    expect(isSameMonth(engine.selectedDate()!, target)).toBe(true);
    const grid = engine.granularityGrids();
    expect(grid.filter((c) => c.isSelected)).toHaveLength(1);
    expect(grid.find((c) => c.date.getMonth() === 3)?.isSelected).toBe(true);
  });

  it('re-picking the same month clears the selection when allowDeselect is true (default)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.selectDate(new Date(2026, 3, 1));
    engine.selectDate(new Date(2026, 3, 20)); // same month, different day

    expect(engine.selectedDate()).toBeNull();
  });

  it('re-picking the same month holds the selection when allowDeselect is false', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setAllowDeselect(false);
    engine.selectDate(new Date(2026, 3, 1));
    engine.selectDate(new Date(2026, 3, 20));

    expect(engine.selectedDate()).not.toBeNull();
  });

  it('isCurrentPeriod marks the cell containing CALENDAR_TODAY', () => {
    const engine = createEngine({ today: fixedToday }); // June 2026
    engine.setSelectionGranularity('month');
    const grid = engine.granularityGrids();
    expect(grid.filter((c) => c.isCurrentPeriod)).toHaveLength(1);
    expect(grid.find((c) => c.date.getMonth() === 5)?.isCurrentPeriod).toBe(true);
  });
});

describe('GranularityPickerEngine — range selection (year granularity)', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('first pick opens a draft, second pick commits an ordered range', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setSelectionMode('range');

    engine.selectDate(new Date(2028, 0, 1));
    expect(engine.isDraftActive()).toBe(true);
    expect(engine.selectedRange()).toEqual({ start: null, end: null });

    engine.selectDate(new Date(2026, 0, 1)); // earlier year, picked second
    expect(engine.isDraftActive()).toBe(false);
    expect(engine.selectedRange().start?.getFullYear()).toBe(2026);
    expect(engine.selectedRange().end?.getFullYear()).toBe(2028);
  });

  it('marks years strictly between the endpoints isInRange', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setSelectionMode('range');
    engine.setYearsToDisplay(5); // 2026..2030
    engine.selectDate(new Date(2026, 0, 1));
    engine.selectDate(new Date(2030, 0, 1));

    const grid = engine.granularityGrids();
    expect(grid.find((c) => c.date.getFullYear() === 2028)?.isInRange).toBe(true);
    expect(grid.find((c) => c.date.getFullYear() === 2026)?.isInRange).toBe(false);
    expect(grid.find((c) => c.date.getFullYear() === 2026)?.isRangeStart).toBe(true);
    expect(grid.find((c) => c.date.getFullYear() === 2030)?.isRangeEnd).toBe(true);
  });

  it('abortRangeDraft discards an in-progress draft without touching selectedRange', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setSelectionMode('range');
    engine.selectDate(new Date(2026, 0, 1));
    engine.selectDate(new Date(2028, 0, 1)); // commit a range first
    engine.selectDate(new Date(2029, 0, 1)); // reopen a new draft

    expect(engine.isDraftActive()).toBe(true);
    engine.abortRangeDraft();

    expect(engine.isDraftActive()).toBe(false);
    expect(engine.selectedRange().start?.getFullYear()).toBe(2026);
    expect(engine.selectedRange().end?.getFullYear()).toBe(2028);
  });
});

describe('GranularityPickerEngine — multi selection (quarter granularity, I6/Decision 11)', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('accumulates non-contiguous quarters via toggle, deduping same-quarter picks', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 0 });
    engine.setSelectionGranularity('quarter');
    engine.setSelectionMode('multi');

    engine.selectDate(new Date(2026, 0, 5)); // Q1
    engine.selectDate(new Date(2026, 9, 20)); // Q4
    engine.selectDate(new Date(2026, 1, 1)); // still Q1 — should toggle OFF, not add a 3rd

    expect(engine.selectedDates()).toHaveLength(1);
    expect(engine.selectedDates()[0].getMonth()).toBe(9);
  });

  it('toggle removal is unaffected by allowDeselect', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 0 });
    engine.setSelectionGranularity('quarter');
    engine.setSelectionMode('multi');
    engine.setAllowDeselect(false);

    engine.selectDate(new Date(2026, 0, 5));
    engine.selectDate(new Date(2026, 0, 20)); // same quarter, should still remove

    expect(engine.selectedDates()).toHaveLength(0);
  });

  it('removeDate removes a single entry and no-ops when absent', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 0 });
    engine.setSelectionGranularity('quarter');
    engine.setSelectionMode('multi');
    engine.selectDate(new Date(2026, 0, 5));
    engine.selectDate(new Date(2026, 6, 5));

    engine.removeDate(new Date(2026, 1, 1)); // same quarter as the first pick
    expect(engine.selectedDates()).toHaveLength(1);

    engine.removeDate(new Date(2026, 1, 1)); // already gone, no-op
    expect(engine.selectedDates()).toHaveLength(1);
  });

  it('removeDate throws outside multi mode', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 0 });
    engine.setSelectionGranularity('quarter');
    engine.setSelectionMode('single');
    expect(() => engine.removeDate(new Date(2026, 0, 5))).toThrow();
  });

  it('setSelectedDates filters out disabled periods per-item', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 0 });
    engine.setSelectionGranularity('quarter');
    engine.setSelectionMode('multi');
    engine.setDisabled((d) => d.getMonth() === 6); // Q3 disabled

    engine.setSelectedDates([new Date(2026, 0, 1), new Date(2026, 6, 1), new Date(2026, 9, 1)]);

    expect(engine.selectedDates()).toHaveLength(2);
  });

  it('clearSelection empties the multi collection', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 0 });
    engine.setSelectionGranularity('quarter');
    engine.setSelectionMode('multi');
    engine.selectDate(new Date(2026, 0, 5));
    engine.clearSelection();
    expect(engine.selectedDates()).toHaveLength(0);
  });
});

describe('GranularityPickerEngine — I2 disabled-date enforcement', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('selectDate is a no-op for a disabled period', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setDisabled((d) => d.getMonth() === 3); // April disabled

    engine.selectDate(new Date(2026, 3, 1));

    expect(engine.selectedDate()).toBeNull();
  });

  it('setDisabled proactively clears an existing selection it now catches', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.selectDate(new Date(2026, 3, 1));

    engine.setDisabled((d) => d.getMonth() === 3);

    expect(engine.selectedDate()).toBeNull();
  });
});

describe('GranularityPickerEngine — programmatic writes (R7 parity)', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('setSelectedDate is idempotent, unlike selectDate', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    const target = new Date(2026, 3, 1);

    engine.setSelectedDate(target);
    engine.setSelectedDate(target);

    expect(engine.selectedDate()).not.toBeNull();
  });

  it('setSelectedRange rejects the whole write when either endpoint is disabled', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setSelectionMode('range');
    engine.setDisabled((d) => d.getFullYear() === 2028);

    engine.setSelectedRange({ start: new Date(2026, 0, 1), end: new Date(2028, 0, 1) });

    expect(engine.selectedRange()).toEqual({ start: null, end: null });
  });

  it('setSelectedRange orders reversed endpoints chronologically', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setSelectionMode('range');

    engine.setSelectedRange({ start: new Date(2028, 0, 1), end: new Date(2026, 0, 1) });

    expect(engine.selectedRange().start?.getFullYear()).toBe(2026);
    expect(engine.selectedRange().end?.getFullYear()).toBe(2028);
  });
});

describe('GranularityPickerEngine — switching granularity/mode resets state', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('setSelectionGranularity resets selectedDate/selectedRange/selectedDates/draft', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.selectDate(new Date(2026, 3, 1));
    expect(engine.selectedDate()).not.toBeNull();

    engine.setSelectionGranularity('year');

    expect(engine.selectedDate()).toBeNull();
  });

  it('setSelectionMode resets selectedDate/selectedRange/selectedDates/draft', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.selectDate(new Date(2026, 3, 1));

    engine.setSelectionMode('multi');

    expect(engine.selectedDate()).toBeNull();
    expect(engine.selectedDates()).toHaveLength(0);
  });
});
