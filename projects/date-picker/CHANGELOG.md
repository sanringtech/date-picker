# @sanring/date-picker

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
