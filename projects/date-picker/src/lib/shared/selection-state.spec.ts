import { isSameMonth } from 'date-fns/isSameMonth';
import {
  advanceRangeDraft,
  filterSelectedDates,
  toggleMultiSelection,
  toggleSingleSelection,
} from './selection-state';

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

describe('toggleSingleSelection', () => {
  it('selects when nothing is currently selected', () => {
    const result = toggleSingleSelection(null, new Date(2026, 3, 1), true, isSameMonth);
    expect(result).toEqual(new Date(2026, 3, 1));
  });

  it('clears when re-picking the same period and allowDeselect is true', () => {
    const current = new Date(2026, 3, 1);
    const result = toggleSingleSelection(current, new Date(2026, 3, 15), true, isSameMonth);
    expect(result).toBeNull();
  });

  it('holds when re-picking the same period and allowDeselect is false', () => {
    const current = new Date(2026, 3, 1);
    const result = toggleSingleSelection(current, new Date(2026, 3, 15), false, isSameMonth);
    expect(result).toBe(current);
  });

  it('replaces when picking a different period', () => {
    const current = new Date(2026, 3, 1);
    const result = toggleSingleSelection(current, new Date(2026, 4, 1), true, isSameMonth);
    expect(result).toEqual(new Date(2026, 4, 1));
  });
});

describe('advanceRangeDraft', () => {
  it('opens a draft on the first pick', () => {
    const result = advanceRangeDraft(null, new Date(2026, 3, 1));
    expect(result.draftStart).toEqual(new Date(2026, 3, 1));
    expect(result.committedRange).toBeNull();
  });

  it('commits and orders endpoints chronologically on the second pick (forward)', () => {
    const result = advanceRangeDraft(new Date(2026, 3, 1), new Date(2026, 5, 1));
    expect(result.draftStart).toBeNull();
    expect(result.committedRange).toEqual({ start: new Date(2026, 3, 1), end: new Date(2026, 5, 1) });
  });

  it('commits and orders endpoints chronologically on the second pick (reversed)', () => {
    const result = advanceRangeDraft(new Date(2026, 5, 1), new Date(2026, 3, 1));
    expect(result.draftStart).toBeNull();
    expect(result.committedRange).toEqual({ start: new Date(2026, 3, 1), end: new Date(2026, 5, 1) });
  });
});

describe('toggleMultiSelection', () => {
  it('adds a period not yet in the collection', () => {
    const result = toggleMultiSelection(new Map(), new Date(2026, 3, 1), monthKey);
    expect(result.size).toBe(1);
    expect(result.has('2026-3')).toBe(true);
  });

  it('removes a period already in the collection, regardless of exact Date instance', () => {
    const current = new Map([['2026-3', new Date(2026, 3, 1)]]);
    const result = toggleMultiSelection(current, new Date(2026, 3, 15), monthKey);
    expect(result.size).toBe(0);
  });

  it('does not mutate the input map', () => {
    const current = new Map<string, Date>();
    toggleMultiSelection(current, new Date(2026, 3, 1), monthKey);
    expect(current.size).toBe(0);
  });
});

describe('filterSelectedDates', () => {
  it('drops disabled dates while keeping the rest (per-item filtering)', () => {
    const isDisabled = (d: Date) => d.getMonth() === 5; // June disabled
    const result = filterSelectedDates(
      [new Date(2026, 3, 1), new Date(2026, 5, 1), new Date(2026, 7, 1)],
      monthKey,
      isDisabled,
    );
    expect(result.size).toBe(2);
    expect(result.has('2026-5')).toBe(false);
  });

  it('deduplicates by key', () => {
    const result = filterSelectedDates(
      [new Date(2026, 3, 1), new Date(2026, 3, 20)],
      monthKey,
      () => false,
    );
    expect(result.size).toBe(1);
  });
});
