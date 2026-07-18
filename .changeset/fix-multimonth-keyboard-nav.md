---
"@sanring/date-picker": patch
---

Fix `CalendarEngine.moveFocus()` keyboard navigation (arrows/Home/End) producing incorrect focus jumps when `monthsToDisplay > 1`. Adjacent months' 42-cell grids can overlap (a month's trailing overflow days and the next month's leading overflow days can be the same calendar dates, rendered at two different grid positions), which broke the previous flat-array-indexing approach. Navigation is now computed with plain calendar-day arithmetic instead, which isn't affected by grid overlap. `monthsToDisplay: 1` (the default) was never affected — this only reaches multi-month setups.
