---
'@sanring/date-picker-widget': patch
---

Fix missing accessible name on the Overlay dialog (`role="dialog"` now carries an `aria-label`), caught by a new axe-core WAI-ARIA test suite covering both `DatePickerComponent` and `DateRangePickerComponent` (W4).
