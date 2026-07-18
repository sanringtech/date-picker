---
"@sanring/date-picker": minor
---

Add `GranularityPickerEngine` (M7): a headless Month/Quarter/Year-picker state machine, sibling to `CalendarEngine` rather than an extension of it (see ADR-0001 for the architecture decision).

- `GranularityPickerEngine` — Single/Range/Multi selection over month (12-cell), quarter (4-cell, fiscal-quarter aware), and year (N-cell sliding window) granularity, with the same state-machine semantics as `CalendarEngine` (`selectDate`, `setSelectedDate`/`setSelectedRange`/`setSelectedDates`, `removeDate`, `setDisabled`, `clearSelection`, `abortRangeDraft`).
- `Granularity`, `GranularityCell`, `QuarterStartMonth` — new public types.
- `CALENDAR_QUARTER_STARTS_ON` — new `InjectionToken<QuarterStartMonth>`, no default factory (Zero-default, mirrors `CALENDAR_LOCALE`); required only when using quarter granularity.

Fully additive — no existing `CalendarEngine` behavior or public API changes.
