# @sanring/date-picker

Headless Angular date-picker engines — pure logic, zero DOM/CSS assumptions. It supports day/date selection through `CalendarEngine`, and month/quarter/year period selection through `GranularityPickerEngine`; you own every pixel of markup and styling (Tailwind, plain CSS, whatever).

Built on Angular Standalone + Signals, with `date-fns` for calendar math.

## Why headless

Off-the-shelf Angular datepickers (Material, PrimeNG, ...) couple appearance to logic. If your layout doesn't fit their component shape, you end up fighting CSS overrides or rewriting the whole thing. This package only does the "brain": inject `CalendarEngine` for day/date selection or `GranularityPickerEngine` for month/quarter/year period selection, bind the matching directive to your own markup, read the output signals, render however you like.

## Granularity contract

`@sanring/date-picker` names all supported selectable units with the public `Granularity` type:

```ts
type Granularity = 'day' | 'month' | 'quarter' | 'year';
```

The engine split is intentional:

| Granularity | Engine                    | Directive                  | Grid signal          |
| ----------- | ------------------------- | -------------------------- | -------------------- |
| `day`       | `CalendarEngine`          | `CalendarGridDirective`    | `monthGrids()`       |
| `month`     | `GranularityPickerEngine` | `GranularityGridDirective` | `granularityGrids()` |
| `quarter`   | `GranularityPickerEngine` | `GranularityGridDirective` | `granularityGrids()` |
| `year`      | `GranularityPickerEngine` | `GranularityGridDirective` | `granularityGrids()` |

Use `engineKindForGranularity()`, `isDayGranularity()`, or `isPeriodGranularity()` when an integration layer needs to route a user-facing `granularity` input to the correct engine. `GranularityPickerEngine.setSelectionGranularity()` deliberately accepts only `month | quarter | year`; `day` is already covered by `CalendarEngine`.

## Installation

```bash
npm install @sanring/date-picker
```

Peer dependencies: `@angular/common` and `@angular/core` ^22.0.0.

## Quick start

### 1. Provide the locale token

`CALENDAR_LOCALE` has no built-in default — Angular will throw if you forget to provide it. This is intentional: the engine refuses to silently assume any locale convention.

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { CALENDAR_LOCALE } from '@sanring/date-picker';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: CALENDAR_LOCALE,
      useValue: {
        weekStartsOn: 1, // Monday
        weekdayLabels: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        monthLabels: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
      },
    },
  ],
};
```

### 2. Mount the directive and render

```ts
// my-calendar.component.ts
import { Component } from '@angular/core';
import { CalendarGridDirective } from '@sanring/date-picker';

@Component({
  selector: 'my-calendar',
  imports: [CalendarGridDirective],
  template: `
    <div sanringCalendarGrid #grid="sanringCalendarGrid" tabindex="0">
      @for (monthGrid of grid.engine.monthGrids(); track $index) {
        <div role="grid" [attr.aria-label]="monthGrid[7].date | date: 'MMMM yyyy'">
          @for (week of toWeeks(monthGrid); track $index) {
            <div role="row" style="display:contents">
              @for (day of week; track day.date.getTime()) {
                <button
                  role="gridcell"
                  [disabled]="day.isDisabled"
                  [attr.aria-selected]="day.isSelected ? true : null"
                  [attr.aria-label]="day.date | date: 'yyyy-MM-dd'"
                  [class.selected]="day.isSelected"
                  [class.today]="day.isToday"
                  [class.other-month]="!day.isCurrentMonth"
                  (click)="grid.engine.selectDate(day.date)"
                >
                  {{ day.date.getDate() }}
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MyCalendarComponent {
  toWeeks(grid: CalendarDay[]): CalendarDay[][] {
    const rows = [];
    for (let i = 0; i < 42; i += 7) rows.push(grid.slice(i, i + 7));
    return rows;
  }
}
```

## API reference

### `CalendarGridDirective`

Selector: `[sanringCalendarGrid]` — Export as: `sanringCalendarGrid`

Mount this on any focusable container element. It provisions a `CalendarEngine` instance (component-scoped, isolated per directive) and wires keyboard events to it.

```html
<div sanringCalendarGrid #grid="sanringCalendarGrid" tabindex="0">
  <!-- read grid.engine.* signals here -->
</div>
```

**Keyboard bindings (WAI-ARIA Date Picker Grid pattern):**

| Key                   | Behaviour                                                                    |
| --------------------- | ---------------------------------------------------------------------------- |
| `←` `→` `↑` `↓`       | Move focus one day / one week; auto-pages to adjacent month at grid boundary |
| `Home` / `End`        | First / last day of the current week row                                     |
| `PageUp` / `PageDown` | Same day-of-month in previous / next month                                   |
| `Enter` / `Space`     | Select the focused date (no-op if disabled)                                  |
| `Escape`              | Abort a range draft (range mode only)                                        |

---

### `CalendarEngine`

Day/date selection engine. Provided per `CalendarGridDirective` instance. Access via the exported template reference: `#grid="sanringCalendarGrid"` → `grid.engine`.

#### Configuration methods

| Method               | Signature                                     | Description                                                                                              |
| -------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `setViewDate`        | `(date: Date): void`                          | Jump to a month. Invalid input falls back to today.                                                      |
| `nextMonth`          | `(): void`                                    | Advance viewDate by one month.                                                                           |
| `prevMonth`          | `(): void`                                    | Retreat viewDate by one month.                                                                           |
| `setSelectionMode`   | `('single' \| 'range'): void`                 | Switch mode; resets all selection state.                                                                 |
| `setMonthsToDisplay` | `(n: number): void`                           | Render N parallel months (minimum 1). `monthGrids()` returns N arrays.                                   |
| `setDisabled`        | `(input: DisabledInput \| undefined): void`   | Set disabled-date matchers. Any existing selection that conflicts is cleared immediately (I2 invariant). |
| `setAllowDeselect`   | `(allow: boolean): void`                      | Whether re-clicking the selected date clears it (default `true`).                                        |
| `setLocale`          | `(locale: CalendarLocale \| undefined): void` | Override the injected `CALENDAR_LOCALE` for this instance.                                               |

#### Action methods

| Method            | Signature                         | Description                                                                                                                 |
| ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `selectDate`      | `(date: Date): void`              | Single mode: select / deselect. Range mode: first call sets draft start, second commits the range. No-op on disabled dates. |
| `clearSelection`  | `(): void`                        | Clear selected date or range. Does **not** change `viewDate`.                                                               |
| `abortRangeDraft` | `(): void`                        | Discard an in-progress range draft; `selectedRange` reverts to the last committed value.                                    |
| `moveFocus`       | `(dir: FocusMoveDirection): void` | Programmatically move keyboard focus. Useful for custom key handling outside the directive.                                 |
| `isDateDisabled`  | `(date: Date): boolean`           | Query whether a date is matched by the current `DisabledInput`.                                                             |

#### Read-only signals

| Signal          | Type                      | Description                                                                                  |
| --------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `monthGrids`    | `Signal<CalendarDay[][]>` | N arrays of exactly 42 cells each (I3 invariant). Recomputes reactively on any state change. |
| `selectedDate`  | `Signal<Date \| null>`    | Single-mode selection.                                                                       |
| `selectedRange` | `Signal<DateRange>`       | Committed range (`{ start, end }`). Never mutated during a draft.                            |
| `isDraftActive` | `Signal<boolean>`         | True while range first endpoint is picked but second is not.                                 |
| `draftStart`    | `Signal<Date \| null>`    | The pending range start while `isDraftActive` is true.                                       |
| `focusedDate`   | `Signal<Date \| null>`    | Current keyboard focus cell. Also used as live preview end during a range draft.             |

---

### `GranularityGridDirective`

Selector: `[sanringGranularityGrid]` — Export as: `sanringGranularityGrid`

Mount this on any focusable container element when rendering month, quarter, or year period cells. It provisions a `GranularityPickerEngine` instance and wires keyboard events to it.

### `GranularityPickerEngine`

Month/quarter/year period-selection engine. It is the period-granularity sibling of `CalendarEngine`; it does not accept `day` because day/date selection is handled by `CalendarEngine`.

#### Configuration methods

| Method                     | Signature                                           | Description                                                                                     |
| -------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `setSelectionGranularity`  | `('month' \| 'quarter' \| 'year'): void`            | Switch selectable period unit; resets all selection state.                                      |
| `setViewDate`              | `(date: Date): void`                                | Jump the period grid to the year/window containing the date. Invalid input falls back to today. |
| `nextYear` / `prevYear`    | `(): void`                                          | Shift the period grid window by one calendar/fiscal year.                                       |
| `setSelectionMode`         | `('single' \| 'range' \| 'multi'): void`            | Switch mode; resets all selection state.                                                        |
| `setYearsToDisplay`        | `(n: number): void`                                 | Year granularity only: set sliding window size, minimum 1.                                      |
| `setGridColumns`           | `(n: number): void`                                 | Up/down keyboard focus step size; keep this in sync with your rendered CSS grid.                |
| `setDisabled`              | `(input: DisabledInput \| undefined): void`         | Set disabled-period matchers. Existing conflicting selections are cleared immediately.          |
| `setRangePeriodCountLimit` | `(limit: RangePeriodCountLimit \| undefined): void` | Optional inclusive min/max count for month/quarter/year range selections.                       |

#### Action methods

Same state-machine surface as `CalendarEngine`: `selectDate`, `setSelectedDate`, `setSelectedRange`, `setSelectedDates`, `removeDate`, `clearSelection`, `abortRangeDraft`, `moveFocus`, and `isDateDisabled`. Dates passed to period selection act as anchors for the selected month, quarter, or year.

#### Read-only signals

| Signal             | Type                        | Description                                                                 |
| ------------------ | --------------------------- | --------------------------------------------------------------------------- |
| `granularityGrids` | `Signal<GranularityCell[]>` | Cells for the active period granularity: 12 months, 4 quarters, or N years. |
| `selectedDate`     | `Signal<Date \| null>`      | Single-mode period selection.                                               |
| `selectedRange`    | `Signal<DateRange>`         | Committed period range.                                                     |
| `selectedDates`    | `Signal<Date[]>`            | Multi-mode period selections.                                               |
| `isDraftActive`    | `Signal<boolean>`           | True while range first endpoint is picked but second is not.                |
| `draftStart`       | `Signal<Date \| null>`      | The pending range start while `isDraftActive` is true.                      |
| `focusedDate`      | `Signal<Date \| null>`      | Current keyboard focus period anchor.                                       |

---

### DI tokens

#### `CALENDAR_LOCALE`

```ts
const CALENDAR_LOCALE: InjectionToken<CalendarLocale>;
```

**No default factory** — Angular throws if you omit this provider. Provide it at app or component level.

#### `CALENDAR_TODAY`

```ts
const CALENDAR_TODAY: InjectionToken<() => Date>;
```

Default factory: `() => new Date()`. Override to inject a fixed timestamp for SSR consistency:

```ts
{ provide: CALENDAR_TODAY, useValue: () => serverRenderedAt }
```

---

### Types

```ts
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean; // false for overflow cells from adjacent months
  isToday: boolean;
  isSelected: boolean; // endpoint in range mode
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean; // strictly between start and end (endpoints excluded); also reflects draft preview
  isDisabled: boolean; // I2: isSelected && isDisabled is always false
  isFocused: boolean;
}

interface CalendarLocale {
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  weekdayLabels: readonly string[]; // length 7, indexed by Date.getDay()
  monthLabels: readonly string[]; // length 12, index 0 = January
  dateFnsLocale?: Locale; // optional date-fns Locale object
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateInterval {
  from: Date;
  to: Date;
}

type DateMatcher = Date | Date[] | DateInterval | ((date: Date) => boolean);
type DisabledInput = DateMatcher | DateMatcher[]; // OR-combined

type Granularity = 'day' | 'month' | 'quarter' | 'year';
type DayGranularity = 'day';
type PeriodGranularity = 'month' | 'quarter' | 'year';
type GranularityEngineKind = 'calendar' | 'period';

type FocusMoveDirection = 'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'pageup' | 'pagedown';
```

---

## Out of scope (permanent)

These are not deferred features — they are outside the engine's service boundary by design:

- Non-Gregorian calendars (lunar, Islamic, Buddhist, ...)
- Date string parsing or formatting (input/output is always `Date` objects)
- Timezone offset calculation / UTC coercion
- Decade view
- Built-in popover / overlay / dropdown chrome
- Built-in `minDate` / `maxDate` / "can't select past" rules (express these via `DisabledInput`)
- Hover / transition state tracking (pure CSS concern)
- SSR hydration detection or delay compensation

## Workspace layout

```
projects/
  date-picker/   publishable library  (ng-packagr → dist/date-picker)
  demo/          Tailwind demo app    (ng serve → localhost:4200)
```

## Development

```bash
ng serve                          # demo app with live reload
ng build date-picker              # build library → dist/date-picker
ng test date-picker --no-watch    # unit tests + axe-core WAI-ARIA gate (78 tests)
ng lint                           # ESLint
npm run format                    # Prettier write
npm run format:check              # Prettier check
```

## Docs

- Business rules (source of truth): `.claude/constitutions/date-picker.md`
- Product/technical spec: `.claude/prds/date-picker.md`
