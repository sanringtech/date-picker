import { TestBed } from '@angular/core/testing';
import { isSameMonth } from 'date-fns/isSameMonth';
import { GranularityPickerEngine } from './granularity-picker-engine';
import { CALENDAR_QUARTER_STARTS_ON, CALENDAR_TODAY } from '../shared/calendar.tokens';

function createEngine(
  options: { today?: Date; quarterStartMonth?: number } = {},
): GranularityPickerEngine {
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

describe('GranularityPickerEngine — moveFocus (2026-07-18, month granularity)', () => {
  const fixedToday = new Date(2026, 5, 15); // June 2026 -> baseline focus lands on index 5

  it('first move without prior focus baselines on the period containing CALENDAR_TODAY', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.moveFocus('right');
    expect(engine.focusedDate()!.getMonth()).toBe(6); // July
  });

  it('left/right move by 1 cell, up/down move by setGridColumns() (default 3)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.moveFocus('left');
    expect(engine.focusedDate()!.getMonth()).toBe(4); // May

    engine.moveFocus('down'); // +3 from May(4) -> August(7)
    expect(engine.focusedDate()!.getMonth()).toBe(7);

    engine.moveFocus('up'); // -3 -> back to May(4)
    expect(engine.focusedDate()!.getMonth()).toBe(4);
  });

  it('setGridColumns() changes the up/down step size', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setGridColumns(4);
    engine.moveFocus('down'); // June(5) + 4 -> October(9)
    expect(engine.focusedDate()!.getMonth()).toBe(9);
  });

  it('Home/End jump to the first/last cell of the whole grid (not a "row")', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.moveFocus('home');
    expect(engine.focusedDate()!.getMonth()).toBe(0); // January

    engine.moveFocus('end');
    expect(engine.focusedDate()!.getMonth()).toBe(11); // December
  });

  it('crossing the right boundary pages to next year and lands on January (Decision 6 precedent)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.moveFocus('end'); // December 2026
    engine.moveFocus('right');

    const focused = engine.focusedDate()!;
    expect(focused.getFullYear()).toBe(2027);
    expect(focused.getMonth()).toBe(0);
  });

  it('crossing the left boundary pages to previous year and lands on December', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.moveFocus('home'); // January 2026
    engine.moveFocus('left');

    const focused = engine.focusedDate()!;
    expect(focused.getFullYear()).toBe(2025);
    expect(focused.getMonth()).toBe(11);
  });

  it('PageDown/PageUp shift the year and carry the same grid index', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.moveFocus('right'); // July(6)
    engine.moveFocus('pagedown');
    let focused = engine.focusedDate()!;
    expect(focused.getFullYear()).toBe(2027);
    expect(focused.getMonth()).toBe(6);

    engine.moveFocus('pageup');
    focused = engine.focusedDate()!;
    expect(focused.getFullYear()).toBe(2026);
    expect(focused.getMonth()).toBe(6);
  });

  it('Enter-equivalent flow: moving focus does not itself select — selectDate(focusedDate) is a separate call', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.moveFocus('right');
    expect(engine.selectedDate()).toBeNull();
    engine.selectDate(engine.focusedDate()!);
    expect(engine.selectedDate()).not.toBeNull();
  });
});

describe('GranularityPickerEngine — moveFocus (quarter granularity, fiscal year)', () => {
  const fixedToday = new Date(2026, 5, 15); // June 2026, quarterStartMonth=3 -> fiscal Q1 index

  it('right/left move by 1 quarter within the fiscal year grid', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 3 });
    engine.setSelectionGranularity('quarter');
    engine.moveFocus('home'); // Q1 of FY2026 (April 2026)
    expect(engine.focusedDate()!.getMonth()).toBe(3);

    engine.moveFocus('right');
    expect(engine.focusedDate()!.getMonth()).toBe(6); // Q2 (July)
  });

  it('crossing the right boundary pages to the next fiscal year, landing on Q1', () => {
    const engine = createEngine({ today: fixedToday, quarterStartMonth: 3 });
    engine.setSelectionGranularity('quarter');
    engine.moveFocus('end'); // Q4 of FY2026 (Jan 2027)
    engine.moveFocus('right');

    const focused = engine.focusedDate()!;
    expect(focused.getFullYear()).toBe(2027);
    expect(focused.getMonth()).toBe(3); // Q1 of FY2027 (April 2027)
  });
});

describe('GranularityPickerEngine — moveFocus (year granularity, sliding window)', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('right/left move by 1 year within the visible window', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.moveFocus('right'); // window starts at 2026 -> index0=2026, right -> 2027
    expect(engine.focusedDate()!.getFullYear()).toBe(2027);
  });

  it('crossing the right boundary reveals exactly one new edge year, not a full-window jump', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setYearsToDisplay(3); // window [2026, 2027, 2028]
    engine.moveFocus('end'); // 2028 (last index)
    engine.moveFocus('right');

    // nextYear() slides the window by exactly 1 -> [2027, 2028, 2029]; the newly
    // revealed edge year is 2029, landing at the new last index — NOT a jump to
    // 2030 (which the day-grid-style "wrap by full window width" formula would
    // incorrectly produce here, since window width (3) != the 1-year page step).
    expect(engine.focusedDate()!.getFullYear()).toBe(2029);
  });

  it('crossing the left boundary reveals exactly one new edge year', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setYearsToDisplay(3);
    engine.moveFocus('home'); // 2026 (first index)
    engine.moveFocus('left');

    expect(engine.focusedDate()!.getFullYear()).toBe(2025);
  });

  it('PageDown/PageUp shift the window and carry the same grid index', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('year');
    engine.setYearsToDisplay(5);
    engine.moveFocus('right'); // index1 = 2027
    engine.moveFocus('pagedown');
    expect(engine.focusedDate()!.getFullYear()).toBe(2028); // window slid to [2027..2031], index1

    engine.moveFocus('pageup');
    expect(engine.focusedDate()!.getFullYear()).toBe(2027);
  });
});

describe('GranularityPickerEngine — setRangePeriodCountLimit (R8-equivalent, month granularity)', () => {
  const fixedToday = new Date(2026, 5, 15);

  it('period count is inclusive of both endpoints (Jan-Mar = 3 months)', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setSelectionMode('range');
    engine.setRangePeriodCountLimit({ maxPeriods: 3 });

    engine.selectDate(new Date(2026, 0, 1));
    engine.selectDate(new Date(2026, 2, 1)); // Jan-Mar, exactly at the 3-month boundary

    expect(engine.isDraftActive()).toBe(false);
    expect(engine.selectedRange().end!.getMonth()).toBe(2);
  });

  it('selectDate rejects an endpoint that exceeds maxPeriods, keeping the draft open', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setSelectionMode('range');
    engine.setRangePeriodCountLimit({ maxPeriods: 3 });

    engine.selectDate(new Date(2026, 0, 1)); // draft start
    engine.selectDate(new Date(2026, 3, 1)); // Jan-Apr = 4 months, exceeds limit

    expect(engine.isDraftActive()).toBe(true);
    expect(engine.draftStart()!.getMonth()).toBe(0);
    expect(engine.selectedRange()).toEqual({ start: null, end: null });
  });

  it('selectDate rejects an endpoint below minPeriods', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setSelectionMode('range');
    engine.setRangePeriodCountLimit({ minPeriods: 3 });

    engine.selectDate(new Date(2026, 0, 1));
    engine.selectDate(new Date(2026, 1, 1)); // Jan-Feb = 2 months, below minimum

    expect(engine.isDraftActive()).toBe(true);
    expect(engine.selectedRange()).toEqual({ start: null, end: null });
  });

  it('setSelectedRange rejects a write that violates the configured limit', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setSelectionMode('range');
    engine.setRangePeriodCountLimit({ maxPeriods: 3 });

    engine.setSelectedRange({ start: new Date(2026, 0, 1), end: new Date(2026, 9, 1) });

    expect(engine.selectedRange()).toEqual({ start: null, end: null });
  });

  it('setRangePeriodCountLimit proactively clears an already-committed range it now violates', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setSelectionMode('range');
    engine.selectDate(new Date(2026, 0, 1));
    engine.selectDate(new Date(2026, 9, 1)); // 10-month range, committed while unbounded

    engine.setRangePeriodCountLimit({ maxPeriods: 3 });

    expect(engine.selectedRange()).toEqual({ start: null, end: null });
  });

  it('setRangePeriodCountLimit leaves a still-valid committed range untouched', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setSelectionMode('range');
    engine.selectDate(new Date(2026, 0, 1));
    engine.selectDate(new Date(2026, 1, 1)); // 2-month range

    engine.setRangePeriodCountLimit({ maxPeriods: 3 });

    expect(engine.selectedRange().start!.getMonth()).toBe(0);
    expect(engine.selectedRange().end!.getMonth()).toBe(1);
  });

  it('is unbounded by default (Zero-default) — a large range commits fine with no limit configured', () => {
    const engine = createEngine({ today: fixedToday });
    engine.setSelectionGranularity('month');
    engine.setSelectionMode('range');

    engine.selectDate(new Date(2026, 0, 1));
    engine.selectDate(new Date(2030, 0, 1)); // a huge span

    expect(engine.isDraftActive()).toBe(false);
    expect(engine.selectedRange().start).not.toBeNull();
  });
});
