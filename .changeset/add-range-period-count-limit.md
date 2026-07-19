---
"@sanring/date-picker": minor
---

Add `RangePeriodCountLimit` and `GranularityPickerEngine.setRangePeriodCountLimit()` — the month/quarter/year-granularity counterpart to `CalendarEngine`'s `RangeDayCountLimit`/`setRangeDayCountLimit()` (R8/Decision 14). "Days" isn't a meaningful unit once the selectable unit is itself a month/quarter/year, so this is a separate type (`{ minPeriods?, maxPeriods? }`) rather than a reuse of `RangeDayCountLimit`.

Same contract as the day-count limit: Zero-default (unbounded unless configured), inclusive count (e.g. Jan–Mar counts as 3 months), a Draft endpoint that violates the limit is rejected outright (the draft stays open at its original start), and setting a new limit proactively clears an already-committed range that now violates it.

Fully additive — no existing `CalendarEngine`/`GranularityPickerEngine` behavior changes.
