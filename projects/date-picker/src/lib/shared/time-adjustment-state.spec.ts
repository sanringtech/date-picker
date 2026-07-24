import type { TimeAdjustmentDraft, TimeGuardMatcher, TimeValue } from './calendar.types';
import { confirmTimeDraft, removeTimeDraft, startOrUpdateTimeDraft } from './time-adjustment-state';

const EMPTY: ReadonlyMap<string, TimeAdjustmentDraft> = new Map();
const BASE = new Date(2026, 6, 24, 0, 0, 0, 0); // 2026-07-24 00:00:00.000

// ---------------------------------------------------------------------------
// startOrUpdateTimeDraft
// ---------------------------------------------------------------------------

describe('startOrUpdateTimeDraft — basic draft lifecycle', () => {
  it('creates a new draft when the key is absent', () => {
    const value: TimeValue = { hours: 9, minutes: 30 };
    const result = startOrUpdateTimeDraft(EMPTY, 'single', BASE, value);
    expect(result.size).toBe(1);
    expect(result.get('single')).toEqual({ baseDate: BASE, draftValue: value });
  });

  it('overwrites an existing draft for the same key', () => {
    const first = startOrUpdateTimeDraft(EMPTY, 'single', BASE, { hours: 9 });
    const result = startOrUpdateTimeDraft(first, 'single', BASE, { hours: 10, minutes: 30 });
    expect(result.size).toBe(1);
    expect(result.get('single')?.draftValue).toEqual({ hours: 10, minutes: 30 });
  });

  it('does not mutate the input map', () => {
    const input = new Map<string, TimeAdjustmentDraft>([
      ['existing', { baseDate: BASE, draftValue: { hours: 8 } }],
    ]);
    startOrUpdateTimeDraft(input, 'new', BASE, { hours: 9 });
    expect(input.size).toBe(1);
  });
});

describe('startOrUpdateTimeDraft — guard hook (ADR-0003 silent reject)', () => {
  it('returns the original map reference when guard blocks the update', () => {
    const guard: TimeGuardMatcher = () => true;
    const result = startOrUpdateTimeDraft(EMPTY, 'single', BASE, { hours: 9 }, guard);
    expect(result).toBe(EMPTY);
  });

  it('applies the draft when guard allows it', () => {
    const guard: TimeGuardMatcher = () => false;
    const result = startOrUpdateTimeDraft(EMPTY, 'single', BASE, { hours: 9 }, guard);
    expect(result.size).toBe(1);
  });

  it('passes both baseDate and value to the guard', () => {
    const received: { date: Date; time: TimeValue }[] = [];
    const guard: TimeGuardMatcher = (date, time) => {
      received.push({ date, time });
      return false;
    };
    const value: TimeValue = { hours: 22 };
    startOrUpdateTimeDraft(EMPTY, 'single', BASE, value, guard);
    expect(received).toHaveLength(1);
    expect(received[0].date).toBe(BASE);
    expect(received[0].time).toBe(value);
  });
});

describe('startOrUpdateTimeDraft — Range same-day key collision (ADR-0003 §Decision 3)', () => {
  it('range-start and range-end are independent even when baseDate is identical', () => {
    const sameDay = new Date(2026, 6, 24);
    const withStart = startOrUpdateTimeDraft(EMPTY, 'range-start', sameDay, { hours: 9 });
    const result = startOrUpdateTimeDraft(withStart, 'range-end', sameDay, { hours: 17 });
    expect(result.size).toBe(2);
    expect(result.get('range-start')?.draftValue).toEqual({ hours: 9 });
    expect(result.get('range-end')?.draftValue).toEqual({ hours: 17 });
  });
});

// ---------------------------------------------------------------------------
// confirmTimeDraft
// ---------------------------------------------------------------------------

describe('confirmTimeDraft — missing key', () => {
  it('returns null composed and the same map reference when key is absent', () => {
    const { composed, drafts } = confirmTimeDraft(EMPTY, 'missing', 'hour-minute');
    expect(composed).toBeNull();
    expect(drafts).toBe(EMPTY);
  });

  it('double-confirm returns null on the second call', () => {
    const map = startOrUpdateTimeDraft(EMPTY, 'single', BASE, { hours: 9 });
    const { drafts: afterFirst } = confirmTimeDraft(map, 'single', 'hour-minute');
    const { composed } = confirmTimeDraft(afterFirst, 'single', 'hour-minute');
    expect(composed).toBeNull();
  });
});

describe('confirmTimeDraft — Date composition by precision', () => {
  const base = new Date(2026, 11, 31, 0, 0, 0, 0); // 2026-12-31
  const fullValue: TimeValue = { hours: 9, minutes: 30, seconds: 45 };

  it('hour precision: applies hours only, zeroes minutes/seconds/ms', () => {
    const map = startOrUpdateTimeDraft(EMPTY, 'k', base, fullValue);
    const { composed } = confirmTimeDraft(map, 'k', 'hour');
    expect(composed?.getHours()).toBe(9);
    expect(composed?.getMinutes()).toBe(0);
    expect(composed?.getSeconds()).toBe(0);
    expect(composed?.getMilliseconds()).toBe(0);
  });

  it('hour-minute precision: applies hours + minutes, zeroes seconds/ms', () => {
    const map = startOrUpdateTimeDraft(EMPTY, 'k', base, fullValue);
    const { composed } = confirmTimeDraft(map, 'k', 'hour-minute');
    expect(composed?.getHours()).toBe(9);
    expect(composed?.getMinutes()).toBe(30);
    expect(composed?.getSeconds()).toBe(0);
    expect(composed?.getMilliseconds()).toBe(0);
  });

  it('hour-minute-second precision: applies all three components', () => {
    const map = startOrUpdateTimeDraft(EMPTY, 'k', base, fullValue);
    const { composed } = confirmTimeDraft(map, 'k', 'hour-minute-second');
    expect(composed?.getHours()).toBe(9);
    expect(composed?.getMinutes()).toBe(30);
    expect(composed?.getSeconds()).toBe(45);
    expect(composed?.getMilliseconds()).toBe(0);
  });

  it('preserves year/month/day from baseDate', () => {
    const map = startOrUpdateTimeDraft(EMPTY, 'k', base, { hours: 23, minutes: 59 });
    const { composed } = confirmTimeDraft(map, 'k', 'hour-minute');
    expect(composed?.getFullYear()).toBe(2026);
    expect(composed?.getMonth()).toBe(11);
    expect(composed?.getDate()).toBe(31);
  });
});

describe('confirmTimeDraft — draft cleanup', () => {
  it('removes the confirmed key from the returned map', () => {
    const map = startOrUpdateTimeDraft(EMPTY, 'single', BASE, { hours: 9 });
    const { drafts } = confirmTimeDraft(map, 'single', 'hour-minute');
    expect(drafts.size).toBe(0);
  });

  it('leaves other keys untouched', () => {
    const map = new Map<string, TimeAdjustmentDraft>([
      ['range-start', { baseDate: BASE, draftValue: { hours: 9 } }],
      ['range-end', { baseDate: BASE, draftValue: { hours: 17 } }],
    ]);
    const { drafts } = confirmTimeDraft(map, 'range-start', 'hour-minute');
    expect(drafts.size).toBe(1);
    expect(drafts.has('range-end')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// removeTimeDraft
// ---------------------------------------------------------------------------

describe('removeTimeDraft — abort (zero-rollback path)', () => {
  it('removes the key from the returned map', () => {
    const map = startOrUpdateTimeDraft(EMPTY, 'single', BASE, { hours: 9 });
    const result = removeTimeDraft(map, 'single');
    expect(result.size).toBe(0);
  });

  it('returns the same reference when the key is absent (safe no-op)', () => {
    const result = removeTimeDraft(EMPTY, 'never-existed');
    expect(result).toBe(EMPTY);
  });

  it('leaves other keys intact', () => {
    const map = new Map<string, TimeAdjustmentDraft>([
      ['range-start', { baseDate: BASE, draftValue: { hours: 9 } }],
      ['range-end', { baseDate: BASE, draftValue: { hours: 17 } }],
    ]);
    const result = removeTimeDraft(map, 'range-start');
    expect(result.size).toBe(1);
    expect(result.has('range-end')).toBe(true);
  });
});
