import { TestBed } from '@angular/core/testing';
import type { TimeGuardMatcher } from '../shared/calendar.types';
import { TimeAdjustmentEngine } from './time-adjustment-engine';

function createEngine(): TimeAdjustmentEngine {
  TestBed.configureTestingModule({ providers: [TimeAdjustmentEngine] });
  return TestBed.inject(TimeAdjustmentEngine);
}

const BASE = new Date(2026, 6, 24, 0, 0, 0, 0); // 2026-07-24

// ---------------------------------------------------------------------------
// startOrUpdateTimeDraft / confirmTimeDraft — happy path
// ---------------------------------------------------------------------------

describe('TimeAdjustmentEngine — confirmTimeDraft composition', () => {
  it('returns null when no draft exists for the key', () => {
    const engine = createEngine();
    expect(engine.confirmTimeDraft('single')).toBeNull();
  });

  it('composes Date correctly for default hour-minute precision', () => {
    const engine = createEngine();
    engine.startOrUpdateTimeDraft('single', BASE, { hours: 9, minutes: 30 });
    const result = engine.confirmTimeDraft('single');
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(6);
    expect(result?.getDate()).toBe(24);
    expect(result?.getHours()).toBe(9);
    expect(result?.getMinutes()).toBe(30);
    expect(result?.getSeconds()).toBe(0);
    expect(result?.getMilliseconds()).toBe(0);
  });

  it('destroys the draft after confirm', () => {
    const engine = createEngine();
    engine.startOrUpdateTimeDraft('single', BASE, { hours: 9, minutes: 30 });
    engine.confirmTimeDraft('single');
    expect(engine.confirmTimeDraft('single')).toBeNull();
  });
});

describe('TimeAdjustmentEngine — precision variants', () => {
  it('hour precision zeroes minutes and seconds', () => {
    const engine = createEngine();
    engine.setTimePrecision('hour');
    engine.startOrUpdateTimeDraft('k', BASE, { hours: 14, minutes: 45, seconds: 30 });
    const result = engine.confirmTimeDraft('k');
    expect(result?.getHours()).toBe(14);
    expect(result?.getMinutes()).toBe(0);
    expect(result?.getSeconds()).toBe(0);
  });

  it('hour-minute precision zeroes seconds', () => {
    const engine = createEngine();
    engine.setTimePrecision('hour-minute');
    engine.startOrUpdateTimeDraft('k', BASE, { hours: 14, minutes: 45, seconds: 30 });
    const result = engine.confirmTimeDraft('k');
    expect(result?.getHours()).toBe(14);
    expect(result?.getMinutes()).toBe(45);
    expect(result?.getSeconds()).toBe(0);
  });

  it('hour-minute-second precision applies all components', () => {
    const engine = createEngine();
    engine.setTimePrecision('hour-minute-second');
    engine.startOrUpdateTimeDraft('k', BASE, { hours: 14, minutes: 45, seconds: 30 });
    const result = engine.confirmTimeDraft('k');
    expect(result?.getHours()).toBe(14);
    expect(result?.getMinutes()).toBe(45);
    expect(result?.getSeconds()).toBe(30);
    expect(result?.getMilliseconds()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// guard hook (ADR-0003: guard evaluated at startOrUpdateTimeDraft call time)
// ---------------------------------------------------------------------------

describe('TimeAdjustmentEngine — guard hook silent reject (I2/R7/Decision 13)', () => {
  it('does not create a draft when the guard blocks it', () => {
    const engine = createEngine();
    const guard: TimeGuardMatcher = () => true;
    engine.setTimeGuard(guard);
    engine.startOrUpdateTimeDraft('single', BASE, { hours: 9 });
    expect(engine.confirmTimeDraft('single')).toBeNull();
  });

  it('creates a draft when guard allows it', () => {
    const engine = createEngine();
    engine.setTimeGuard(() => false);
    engine.startOrUpdateTimeDraft('single', BASE, { hours: 9 });
    expect(engine.confirmTimeDraft('single')).not.toBeNull();
  });

  it('removing the guard restores normal behaviour', () => {
    const engine = createEngine();
    engine.setTimeGuard(() => true);
    engine.startOrUpdateTimeDraft('single', BASE, { hours: 9 });
    engine.setTimeGuard(undefined);
    engine.startOrUpdateTimeDraft('single', BASE, { hours: 9 });
    expect(engine.confirmTimeDraft('single')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// abortTimeDraft — zero-rollback
// ---------------------------------------------------------------------------

describe('TimeAdjustmentEngine — abortTimeDraft (zero-rollback)', () => {
  it('removes an existing draft', () => {
    const engine = createEngine();
    engine.startOrUpdateTimeDraft('single', BASE, { hours: 9 });
    engine.abortTimeDraft('single');
    expect(engine.confirmTimeDraft('single')).toBeNull();
  });

  it('is a no-op when the key does not exist', () => {
    const engine = createEngine();
    expect(() => engine.abortTimeDraft('never-existed')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Range same-day collision (ADR-0003 key design decision)
// ---------------------------------------------------------------------------

describe('TimeAdjustmentEngine — Range same-day key isolation (ADR-0003)', () => {
  it('range-start and range-end drafts are independent when baseDate is identical', () => {
    const engine = createEngine();
    const sameDay = new Date(2026, 6, 24);
    engine.startOrUpdateTimeDraft('range-start', sameDay, { hours: 9, minutes: 0 });
    engine.startOrUpdateTimeDraft('range-end', sameDay, { hours: 17, minutes: 0 });

    const start = engine.confirmTimeDraft('range-start');
    const end = engine.confirmTimeDraft('range-end');

    expect(start?.getHours()).toBe(9);
    expect(end?.getHours()).toBe(17);
  });

  it('confirming range-start does not affect range-end', () => {
    const engine = createEngine();
    const sameDay = new Date(2026, 6, 24);
    engine.startOrUpdateTimeDraft('range-start', sameDay, { hours: 9 });
    engine.startOrUpdateTimeDraft('range-end', sameDay, { hours: 17 });

    engine.confirmTimeDraft('range-start');

    expect(engine.confirmTimeDraft('range-end')?.getHours()).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// Multi — independent drafts per key
// ---------------------------------------------------------------------------

describe('TimeAdjustmentEngine — Multi mode independent drafts', () => {
  it('updating one key does not affect another', () => {
    const engine = createEngine();
    const d1 = new Date(2026, 6, 1);
    const d2 = new Date(2026, 6, 15);
    engine.startOrUpdateTimeDraft('2026-7-1', d1, { hours: 8 });
    engine.startOrUpdateTimeDraft('2026-7-15', d2, { hours: 18 });

    engine.startOrUpdateTimeDraft('2026-7-1', d1, { hours: 9 });

    expect(engine.confirmTimeDraft('2026-7-15')?.getHours()).toBe(18);
  });
});
