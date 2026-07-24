import type { TimeAdjustmentDraft, TimeGuardMatcher, TimePrecision, TimeValue } from './calendar.types';

/**
 * Pure, immutable state-transition functions for TimeAdjustmentEngine (ADR-0003).
 * No signals, no Angular — mirrors the selection-state.ts precedent set by ADR-0001.
 * The engine holds the Map signal; these functions produce the next Map value.
 */

/**
 * Opens or updates a time Draft for the given caller-supplied key.
 * If a guard is registered and returns true for (baseDate, value), the input map is
 * returned unchanged (silent reject — consistent with I2 / R7 / Decision 13).
 */
export function startOrUpdateTimeDraft(
  drafts: ReadonlyMap<string, TimeAdjustmentDraft>,
  key: string,
  baseDate: Date,
  value: TimeValue,
  guard?: TimeGuardMatcher,
): ReadonlyMap<string, TimeAdjustmentDraft> {
  if (guard !== undefined && guard(baseDate, value)) {
    return drafts;
  }
  const next = new Map(drafts);
  next.set(key, { baseDate, draftValue: value });
  return next;
}

/**
 * Commits the Draft for the given key: removes it from the map and returns the
 * composed Date (baseDate's year/month/day + draftValue's time components filtered
 * by precision). Returns null when the key is absent so callers can null-check
 * without try/catch (consistent with CalendarEngine's silent-no-op philosophy).
 */
export function confirmTimeDraft(
  drafts: ReadonlyMap<string, TimeAdjustmentDraft>,
  key: string,
  precision: TimePrecision,
): { drafts: ReadonlyMap<string, TimeAdjustmentDraft>; composed: Date | null } {
  const draft = drafts.get(key);
  if (draft === undefined) {
    return { drafts, composed: null };
  }
  const next = new Map(drafts);
  next.delete(key);
  const result = new Date(draft.baseDate);
  result.setHours(draft.draftValue.hours);
  result.setMinutes(precision !== 'hour' ? (draft.draftValue.minutes ?? 0) : 0);
  result.setSeconds(precision === 'hour-minute-second' ? (draft.draftValue.seconds ?? 0) : 0);
  result.setMilliseconds(0);
  return { drafts: next, composed: result };
}

/**
 * Removes the Draft for the given key without writing any committed value — the
 * "abort" path (mirrors CalendarEngine.abortRangeDraft(): Draft was never merged
 * into committed state, so no rollback logic is needed).
 * Returns the same map reference when the key is absent (safe no-op).
 */
export function removeTimeDraft(
  drafts: ReadonlyMap<string, TimeAdjustmentDraft>,
  key: string,
): ReadonlyMap<string, TimeAdjustmentDraft> {
  if (!drafts.has(key)) {
    return drafts;
  }
  const next = new Map(drafts);
  next.delete(key);
  return next;
}
