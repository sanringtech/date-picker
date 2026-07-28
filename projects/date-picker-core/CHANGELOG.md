# @sanring/date-picker

## 0.5.0

### Minor Changes

- 16efff1: Add `Granularity` routing helpers: `isDayGranularity()`, `isPeriodGranularity()`, `engineKindForGranularity()`, and the `DayGranularity`/`PeriodGranularity`/`GranularityEngineKind` types. Extracted from `GranularityPickerEngine`'s previously-internal `PickerGranularity` literal union (now `PeriodGranularity`) so integration layers built on top of the engine (e.g. a component that needs to pick `CalendarEngine` vs `GranularityPickerEngine` based on a user-facing `granularity` input) don't have to reimplement the same routing logic.

  Fully additive — no existing `CalendarEngine`/`GranularityPickerEngine` behavior or public API changes.

## 0.4.0

### Minor Changes

- b027f33: Add `RangePeriodCountLimit` and `GranularityPickerEngine.setRangePeriodCountLimit()` — the month/quarter/year-granularity counterpart to `CalendarEngine`'s `RangeDayCountLimit`/`setRangeDayCountLimit()` (R8/Decision 14). "Days" isn't a meaningful unit once the selectable unit is itself a month/quarter/year, so this is a separate type (`{ minPeriods?, maxPeriods? }`) rather than a reuse of `RangeDayCountLimit`.

  Same contract as the day-count limit: Zero-default (unbounded unless configured), inclusive count (e.g. Jan–Mar counts as 3 months), a Draft endpoint that violates the limit is rejected outright (the draft stays open at its original start), and setting a new limit proactively clears an already-committed range that now violates it.

  Fully additive — no existing `CalendarEngine`/`GranularityPickerEngine` behavior changes.

## 0.3.1

### Patch Changes

- 39e60e0: Fix `CalendarEngine.moveFocus()` keyboard navigation (arrows/Home/End) producing incorrect focus jumps when `monthsToDisplay > 1`. Adjacent months' 42-cell grids can overlap (a month's trailing overflow days and the next month's leading overflow days can be the same calendar dates, rendered at two different grid positions), which broke the previous flat-array-indexing approach. Navigation is now computed with plain calendar-day arithmetic instead, which isn't affected by grid overlap. `monthsToDisplay: 1` (the default) was never affected — this only reaches multi-month setups.

## 0.3.0

### Minor Changes

- 651811f: Add keyboard navigation to `GranularityPickerEngine` (M7 completion):

  - `GranularityPickerEngine.moveFocus(direction)` / `setGridColumns(n)` — arrow keys, Home/End, PageUp/PageDown over month/quarter/year grids. Column count for up/down is consumer-supplied via `setGridColumns()` since these grids have no calendar-week-equivalent fixed row unit; Home/End jump to the whole grid's first/last cell; boundary-crossing arrows and PageUp/PageDown auto-page by one year.
  - `GranularityGridDirective` — new standalone directive (selector `sanringGranularityGrid`) mirroring `CalendarGridDirective`: mounts a `GranularityPickerEngine` instance and translates keydown events into engine calls.

  Fully additive — no existing `CalendarEngine`/`GranularityPickerEngine` behavior changes.

- e25338a: Add `GranularityPickerEngine` (M7): a headless Month/Quarter/Year-picker state machine, sibling to `CalendarEngine` rather than an extension of it (see ADR-0001 for the architecture decision).

  - `GranularityPickerEngine` — Single/Range/Multi selection over month (12-cell), quarter (4-cell, fiscal-quarter aware), and year (N-cell sliding window) granularity, with the same state-machine semantics as `CalendarEngine` (`selectDate`, `setSelectedDate`/`setSelectedRange`/`setSelectedDates`, `removeDate`, `setDisabled`, `clearSelection`, `abortRangeDraft`).
  - `Granularity`, `GranularityCell`, `QuarterStartMonth` — new public types.
  - `CALENDAR_QUARTER_STARTS_ON` — new `InjectionToken<QuarterStartMonth>`, no default factory (Zero-default, mirrors `CALENDAR_LOCALE`); required only when using quarter granularity.

  Fully additive — no existing `CalendarEngine` behavior or public API changes.

## 0.2.0

### Minor Changes

- 9e7d630: Add programmatic value setters and an optional range day-count limit (R7/R8):

  - `CalendarEngine.setSelectedDate(date)` / `setSelectedRange(range)` — direct write path for binding an existing value (e.g. editing a form), symmetric with `selectDate()`'s disabled check but deliberately not its re-pick-to-deselect toggle. Repeated calls with the same value are idempotent.
  - `CalendarEngine.setRangeDayCountLimit(limit)` / `RangeDayCountLimit` type — optional `{ minDays?, maxDays? }` bound on range selections. Unbounded by default (Zero-default); day count is inclusive of both endpoints. `selectDate()`'s range-commit path and `setSelectedRange()` both reject a pick/write that violates the configured bound; setting a new limit proactively clears an already-committed range it now violates.

  Fully backward compatible — existing `selectDate()`/`selectedRange` behavior is unchanged when no limit is configured.
