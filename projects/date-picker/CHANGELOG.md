# @sanring/date-picker-widget

## 1.0.1

### Patch Changes

- ab0a14c: Fix mobile/narrow-viewport layout of the popover calendar: multi-month views (`DatePicker`/`DateTimePicker` with `monthsToDisplay > 1`, `DateRangePicker`, `DateTimeRangePicker`, `DateMultiPicker`) now stack vertically below the `sm` breakpoint instead of overflowing horizontally off-screen. All overlay dialogs also gained `max-h-[85vh] overflow-y-auto` and a `max-w-[calc(100vw-2rem)]` cap so a tall or wide popover can no longer get clipped by the viewport edge on small screens.

## 0.1.2

### Patch Changes

- 9f2f9bb: Fix missing accessible name on the Overlay dialog (`role="dialog"` now carries an `aria-label`), caught by a new axe-core WAI-ARIA test suite covering both `DatePickerComponent` and `DateRangePickerComponent` (W4).

## 0.1.1

### Patch Changes

- Updated dependencies [16efff1]
  - @sanring/date-picker@0.5.0
