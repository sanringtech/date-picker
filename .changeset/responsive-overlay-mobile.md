---
"@sanring/date-picker": patch
---

Fix mobile/narrow-viewport layout of the popover calendar: multi-month views (`DatePicker`/`DateTimePicker` with `monthsToDisplay > 1`, `DateRangePicker`, `DateTimeRangePicker`, `DateMultiPicker`) now stack vertically below the `sm` breakpoint instead of overflowing horizontally off-screen. All overlay dialogs also gained `max-h-[85vh] overflow-y-auto` and a `max-w-[calc(100vw-2rem)]` cap so a tall or wide popover can no longer get clipped by the viewport edge on small screens.
