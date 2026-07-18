import { buildMonthGrid, GRID_SIZE } from './calendar-grid';

describe('buildMonthGrid', () => {
  const months = [
    new Date(2026, 0, 15), // January 2026 — 31 days
    new Date(2026, 1, 15), // February 2026 — 28 days (not a leap year)
    new Date(2028, 1, 15), // February 2028 — 29 days (leap year)
    new Date(2026, 8, 15), // September 2026 — 30 days
  ];

  it.each(months)('always returns exactly 42 cells for %s', (viewDate) => {
    const grid = buildMonthGrid(viewDate, 1);
    expect(grid).toHaveLength(GRID_SIZE);
    expect(grid).toHaveLength(42);
  });

  it('marks days outside the current month as isCurrentMonth: false, and the rest true', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15), 1); // Feb 2026, weekStartsOn=Monday
    const currentMonthCells = grid.filter((cell) => cell.isCurrentMonth);
    expect(currentMonthCells).toHaveLength(28);
    expect(currentMonthCells.every((cell) => cell.date.getMonth() === 1)).toBe(true);

    const overflowCells = grid.filter((cell) => !cell.isCurrentMonth);
    expect(overflowCells).toHaveLength(GRID_SIZE - 28);
  });

  it('aligns the first cell to the configured weekStartsOn', () => {
    const mondayFirst = buildMonthGrid(new Date(2026, 1, 15), 1);
    expect(mondayFirst[0].date.getDay()).toBe(1);

    const sundayFirst = buildMonthGrid(new Date(2026, 1, 15), 0);
    expect(sundayFirst[0].date.getDay()).toBe(0);
  });

  it('produces 42 consecutive calendar days with no gaps or duplicates', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15), 1);
    for (let i = 1; i < grid.length; i++) {
      const prev = grid[i - 1].date;
      const curr = grid[i].date;
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(1);
    }
  });

  it('zeroes the time components on every cell date', () => {
    const grid = buildMonthGrid(new Date(2026, 1, 15, 13, 45, 30), 1);
    for (const cell of grid) {
      expect(cell.date.getHours()).toBe(0);
      expect(cell.date.getMinutes()).toBe(0);
      expect(cell.date.getSeconds()).toBe(0);
      expect(cell.date.getMilliseconds()).toBe(0);
    }
  });
});
