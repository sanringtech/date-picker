---
"@sanring/date-picker": minor
---

Add programmatic value setters and an optional range day-count limit (R7/R8):

- `CalendarEngine.setSelectedDate(date)` / `setSelectedRange(range)` — direct write path for binding an existing value (e.g. editing a form), symmetric with `selectDate()`'s disabled check but deliberately not its re-pick-to-deselect toggle. Repeated calls with the same value are idempotent.
- `CalendarEngine.setRangeDayCountLimit(limit)` / `RangeDayCountLimit` type — optional `{ minDays?, maxDays? }` bound on range selections. Unbounded by default (Zero-default); day count is inclusive of both endpoints. `selectDate()`'s range-commit path and `setSelectedRange()` both reject a pick/write that violates the configured bound; setting a new limit proactively clears an already-committed range it now violates.

Fully backward compatible — existing `selectDate()`/`selectedRange` behavior is unchanged when no limit is configured.
