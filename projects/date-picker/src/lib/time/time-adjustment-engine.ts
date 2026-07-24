import { Injectable, signal } from '@angular/core';
import type {
  TimeAdjustmentDraft,
  TimeGuardMatcher,
  TimePrecision,
  TimeValue,
} from '../shared/calendar.types';
import {
  confirmTimeDraft,
  removeTimeDraft,
  startOrUpdateTimeDraft,
} from '../shared/time-adjustment-state';

/**
 * Standalone time-adjustment state machine (ADR-0003: independent Injectable,
 * supersedes ADR-0002's "merge into CalendarEngine" approach).
 *
 * Knows nothing about CalendarEngine, GranularityPickerEngine, or the
 * Single/Range/Multi selection modes. It manages a generic Map of
 * caller-supplied string keys → TimeAdjustmentDraft entries. The Widget layer
 * (or any direct consumer) decides key names (e.g. 'single', 'range-start',
 * 'range-end') and wires confirmTimeDraft()'s returned Date back into
 * CalendarEngine via setSelectedDate() / setSelectedRange() / setSelectedDates().
 *
 * Component-scoped (no providedIn) — mirrors CalendarEngine and
 * GranularityPickerEngine's DI convention (ADR-0001 precedent).
 */
@Injectable()
export class TimeAdjustmentEngine {
  private readonly _timeDrafts = signal<ReadonlyMap<string, TimeAdjustmentDraft>>(new Map());
  private readonly _timeGuard = signal<TimeGuardMatcher | undefined>(undefined);
  private readonly _timePrecision = signal<TimePrecision>('hour-minute');

  /**
   * Opens or updates the time Draft for the given key. If a guard is set and
   * returns true for (baseDate, time), the call is silently ignored — no draft
   * is created or modified (consistent with I2 / R7 / Decision 13 silent-no-op).
   */
  startOrUpdateTimeDraft(key: string, baseDate: Date, time: TimeValue): void {
    this._timeDrafts.set(
      startOrUpdateTimeDraft(this._timeDrafts(), key, baseDate, time, this._timeGuard()),
    );
  }

  /**
   * Commits the Draft: removes it from the map and returns the fully composed
   * Date (baseDate's year/month/day + time components per current precision).
   * Returns null when no Draft exists for the key — callers can null-check
   * without try/catch.
   */
  confirmTimeDraft(key: string): Date | null {
    const { drafts, composed } = confirmTimeDraft(this._timeDrafts(), key, this._timePrecision());
    this._timeDrafts.set(drafts);
    return composed;
  }

  /**
   * Aborts the Draft for the given key without writing any committed value.
   * Zero-rollback: the Draft was never merged into CalendarEngine's selected
   * state, so no undo logic is needed (mirrors abortRangeDraft() precedent).
   */
  abortTimeDraft(key: string): void {
    this._timeDrafts.set(removeTimeDraft(this._timeDrafts(), key));
  }

  /** Sets the active precision level (ADR-0003: defaults to 'hour-minute'). */
  setTimePrecision(precision: TimePrecision): void {
    this._timePrecision.set(precision);
  }

  /**
   * Registers a guard predicate evaluated on every startOrUpdateTimeDraft call.
   * Pass undefined to remove an existing guard.
   */
  setTimeGuard(guard: TimeGuardMatcher | undefined): void {
    this._timeGuard.set(guard);
  }
}
