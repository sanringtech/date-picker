---
"@sanring/date-picker": minor
---

Add keyboard navigation to `GranularityPickerEngine` (M7 completion):

- `GranularityPickerEngine.moveFocus(direction)` / `setGridColumns(n)` — arrow keys, Home/End, PageUp/PageDown over month/quarter/year grids. Column count for up/down is consumer-supplied via `setGridColumns()` since these grids have no calendar-week-equivalent fixed row unit; Home/End jump to the whole grid's first/last cell; boundary-crossing arrows and PageUp/PageDown auto-page by one year.
- `GranularityGridDirective` — new standalone directive (selector `sanringGranularityGrid`) mirroring `CalendarGridDirective`: mounts a `GranularityPickerEngine` instance and translates keydown events into engine calls.

Fully additive — no existing `CalendarEngine`/`GranularityPickerEngine` behavior changes.
