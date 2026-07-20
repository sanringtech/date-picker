---
"@sanring/date-picker": minor
---

Add `Granularity` routing helpers: `isDayGranularity()`, `isPeriodGranularity()`, `engineKindForGranularity()`, and the `DayGranularity`/`PeriodGranularity`/`GranularityEngineKind` types. Extracted from `GranularityPickerEngine`'s previously-internal `PickerGranularity` literal union (now `PeriodGranularity`) so integration layers built on top of the engine (e.g. a component that needs to pick `CalendarEngine` vs `GranularityPickerEngine` based on a user-facing `granularity` input) don't have to reimplement the same routing logic.

Fully additive — no existing `CalendarEngine`/`GranularityPickerEngine` behavior or public API changes.
