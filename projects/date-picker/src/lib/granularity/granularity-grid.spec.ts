import {
  MONTH_GRID_SIZE,
  QUARTER_GRID_SIZE,
  buildMonthGranularityGrid,
  buildQuarterGranularityGrid,
  buildYearGranularityGrid,
  fiscalQuarterKey,
  isSameFiscalQuarter,
  periodOrdinal,
  quarterIndexOf,
} from './granularity-grid';

describe('buildMonthGranularityGrid', () => {
  it('always returns exactly 12 cells, January through December of the viewDate year', () => {
    const grid = buildMonthGranularityGrid(new Date(2026, 5, 15));
    expect(grid).toHaveLength(MONTH_GRID_SIZE);
    grid.forEach((cell, i) => {
      expect(cell.date.getFullYear()).toBe(2026);
      expect(cell.date.getMonth()).toBe(i);
      expect(cell.date.getDate()).toBe(1);
    });
  });

  it('zeroes the time components on every cell date', () => {
    const grid = buildMonthGranularityGrid(new Date(2026, 5, 15, 13, 45, 30));
    for (const cell of grid) {
      expect(cell.date.getHours()).toBe(0);
      expect(cell.date.getMinutes()).toBe(0);
    }
  });
});

describe('buildQuarterGranularityGrid', () => {
  it('produces calendar quarters (Jan/Apr/Jul/Oct) when quarterStartMonth=0', () => {
    const grid = buildQuarterGranularityGrid(new Date(2026, 5, 15), 0);
    expect(grid).toHaveLength(QUARTER_GRID_SIZE);
    expect(grid.map((c) => c.date.getMonth())).toEqual([0, 3, 6, 9]);
    expect(grid.every((c) => c.date.getFullYear() === 2026)).toBe(true);
  });

  it('produces fiscal quarters starting April when quarterStartMonth=3', () => {
    const grid = buildQuarterGranularityGrid(new Date(2026, 5, 15), 3); // June 2026 -> FY starting Apr 2026
    expect(grid.map((c) => `${c.date.getFullYear()}-${c.date.getMonth()}`)).toEqual([
      '2026-3',
      '2026-6',
      '2026-9',
      '2027-0',
    ]);
  });

  it('rolls back to the previous fiscal year when viewDate is before quarterStartMonth', () => {
    // Feb 2026 with quarterStartMonth=3 (April) belongs to the FY that started April 2025.
    const grid = buildQuarterGranularityGrid(new Date(2026, 1, 15), 3);
    expect(grid.map((c) => `${c.date.getFullYear()}-${c.date.getMonth()}`)).toEqual([
      '2025-3',
      '2025-6',
      '2025-9',
      '2026-0',
    ]);
  });
});

describe('buildYearGranularityGrid', () => {
  it('produces `count` consecutive years starting at viewDate year (sliding window)', () => {
    const grid = buildYearGranularityGrid(new Date(2026, 5, 15), 5);
    expect(grid.map((c) => c.date.getFullYear())).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(grid.every((c) => c.date.getMonth() === 0 && c.date.getDate() === 1)).toBe(true);
  });
});

describe('quarterIndexOf / isSameFiscalQuarter / fiscalQuarterKey', () => {
  it('quarterIndexOf returns 0-3 relative to quarterStartMonth', () => {
    expect(quarterIndexOf(new Date(2026, 0, 1), 0)).toBe(0); // Jan, calendar quarter
    expect(quarterIndexOf(new Date(2026, 3, 1), 0)).toBe(1); // Apr
    expect(quarterIndexOf(new Date(2026, 1, 1), 3)).toBe(3); // Feb, quarterStartMonth=Apr -> Q4
  });

  it('isSameFiscalQuarter is true only within the same fiscal year and quarter index', () => {
    expect(isSameFiscalQuarter(new Date(2026, 0, 5), new Date(2026, 2, 28), 0)).toBe(true);
    expect(isSameFiscalQuarter(new Date(2026, 0, 5), new Date(2026, 3, 1), 0)).toBe(false);
    // Same calendar month, different fiscal year under a non-zero quarterStartMonth.
    expect(isSameFiscalQuarter(new Date(2025, 1, 5), new Date(2026, 1, 5), 3)).toBe(false);
  });

  it('fiscalQuarterKey is stable for any date within the same fiscal quarter', () => {
    const a = fiscalQuarterKey(new Date(2026, 3, 1), 3);
    const b = fiscalQuarterKey(new Date(2026, 5, 20), 3);
    const c = fiscalQuarterKey(new Date(2026, 6, 1), 3);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('periodOrdinal', () => {
  it('month: strictly increasing across a year boundary', () => {
    const dec = periodOrdinal(new Date(2026, 11, 1), 'month');
    const jan = periodOrdinal(new Date(2027, 0, 1), 'month');
    expect(jan).toBe(dec + 1);
  });

  it('month: same value for any day within the same month', () => {
    expect(periodOrdinal(new Date(2026, 3, 1), 'month')).toBe(
      periodOrdinal(new Date(2026, 3, 28), 'month'),
    );
  });

  it('year: strictly increasing by 1 per year, independent of month', () => {
    expect(
      periodOrdinal(new Date(2027, 0, 1), 'year') - periodOrdinal(new Date(2026, 5, 15), 'year'),
    ).toBe(1);
  });

  it('quarter: strictly increasing across a fiscal-year boundary (quarterStartMonth=3)', () => {
    const q4 = periodOrdinal(new Date(2027, 0, 1), 'quarter', 3); // Jan 2027 -> FY2026 Q4
    const q1next = periodOrdinal(new Date(2027, 3, 1), 'quarter', 3); // Apr 2027 -> FY2027 Q1
    expect(q1next).toBe(q4 + 1);
  });

  it('quarter: same value for any date within the same fiscal quarter', () => {
    expect(periodOrdinal(new Date(2026, 3, 1), 'quarter', 3)).toBe(
      periodOrdinal(new Date(2026, 5, 20), 'quarter', 3),
    );
  });
});
