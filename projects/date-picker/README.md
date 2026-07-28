# @sanring/date-picker

Composed Angular DatePicker / DateRangePicker — an input + Angular CDK Overlay popover calendar, assembled on top of the headless [`@sanring/date-picker-core`](../date-picker/README.md) engine. Ships with sensible default Tailwind styling and CSS Custom Property theming, but nothing here is load-bearing: override the theme tokens, override the `format`, or take full ownership of the source via copy mode.

## Two ways to consume this package

|               | npm install (black-box)                            | Copy mode (ownership transfer)                                 |
| ------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Effort        | `npm install`, done                                | copy 4 files into your project                                 |
| Customization | CSS Custom Properties + `format`/`disabled` inputs | anything — you own the markup                                  |
| Updates       | `npm update`                                       | manual — you track upstream yourself                           |
| When to use   | want a complete DatePicker fast                    | need visual/interaction customization beyond what props expose |

Both modes depend on `@sanring/date-picker-core` (the engine) as a real npm dependency. Copy mode only transfers ownership of the _shell_ (Input + Overlay + Tailwind markup) — never the state machine, keyboard handling, or WAI-ARIA wiring, which stay inside the engine you still import. This mirrors the shadcn/ui pattern: copying the shell doesn't grant access to engine internals, it just means you now own the shell's source instead of importing it.

## Installation (npm)

```bash
npm install @sanring/date-picker @sanring/date-picker-core @angular/cdk
```

Peer dependencies: `@angular/common`, `@angular/core`, `@angular/cdk` ^22.0.0. Requires Tailwind CSS v4 (`@theme inline` syntax) already set up in your app — see [Theming](#2-wire-theming-once-in-your-global-stylesheet) below. There is no precompiled CSS bundle yet for Tailwind-less consumers (a later milestone, not yet built).

### 1. Provide `CALENDAR_LOCALE`

Same token the engine uses — no built-in default, Angular throws if you omit it.

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { CALENDAR_LOCALE } from '@sanring/date-picker-core';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: CALENDAR_LOCALE,
      useValue: {
        weekStartsOn: 1,
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

### 2. Wire theming (once, in your global stylesheet)

The component templates use Tailwind utility classes like `bg-primary`, `text-foreground`, `border-border` — these aren't real color names until you map them onto this package's `--dp-*` CSS Custom Properties via a Tailwind v4 `@theme inline` block:

```css
/* styles.css */
@import '@sanring/date-picker/dp-theme.css';
@import 'tailwindcss';

@theme inline {
  --color-background: var(--dp-bg-base);
  --color-foreground: var(--dp-text-main);
  --color-muted: var(--dp-text-muted);
  --color-border: var(--dp-border);
  --color-border-strong: var(--dp-border-strong);
  --color-surface: var(--dp-surface);
  --color-surface-strong: var(--dp-surface-strong);
  --color-primary: var(--dp-primary);
  --color-primary-foreground: var(--dp-primary-fg);
  --radius: var(--dp-radius);
  --radius-lg: var(--dp-radius-lg);
}
```

Re-theming the widget from here on is just overriding individual `--dp-*` values (e.g. `--dp-primary`) in your own stylesheet — no class edits, no rebuild (constitution I5: every built-in default must be 100% overridable).

### 3. Use the components

```html
<sanring-date-picker [locale]="locale" [(selectedDate)]="selectedDate" placeholder="Pick a date" />

<sanring-date-range-picker
  [locale]="locale"
  [(selectedRange)]="selectedRange"
  placeholder="Pick a date"
/>
```

```ts
import { Component, inject, signal } from '@angular/core';
import { CALENDAR_LOCALE } from '@sanring/date-picker-core';
import type { DateRange } from '@sanring/date-picker-core';
import { DatePickerComponent, DateRangePickerComponent } from '@sanring/date-picker';

@Component({
  imports: [DatePickerComponent, DateRangePickerComponent],
  template: `
    <sanring-date-picker [locale]="locale" [(selectedDate)]="selectedDate" />
    <sanring-date-range-picker [locale]="locale" [(selectedRange)]="selectedRange" />
  `,
})
export class MyComponent {
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedDate = signal<Date | null>(null);
  protected readonly selectedRange = signal<DateRange>({ start: null, end: null });
}
```

## Copy mode (ownership transfer)

For consumers who need to go past what props/CSS variables expose — a different markup structure, a non-CDK popover, custom animation — copy the shell source directly into your project and modify it freely.

### 1. Install what the copied files still import

```bash
npm install @sanring/date-picker-core @angular/cdk date-fns
```

`@sanring/date-picker` itself is **not** a dependency in this mode — you're replacing it with your own copy of its shell.

### 2. Copy these files

From [`projects/date-picker/src/lib/`](./src/lib) in this repo:

| File                                       | Purpose                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `date-picker.component.ts` + `.html`       | Single-mode `<sanring-date-picker>`                                                 |
| `date-range-picker.component.ts` + `.html` | Range-mode `<sanring-date-range-picker>`                                            |
| `date-picker-overlay-shell.component.ts`   | Shared CDK Overlay open/close/anchor lifecycle — both components above depend on it |
| `date-format.ts`                           | `DateFormatConfig` type + the default ISO `yyyy-MM-dd` format/parse pair            |

Drop them anywhere in your project (adjust the relative `./date-format` and `./date-picker-overlay-shell.component` imports if you flatten the folder structure), then wire theming exactly as in [step 2 of the npm quick start](#2-wire-theming-once-in-your-global-stylesheet) above — either copy [`dp-theme.css`](./src/dp-theme.css) alongside the components too, or point the same `@theme inline` mapping at your own existing design tokens instead.

### 3. Now it's yours

Change markup, swap the popover implementation, add animation, restructure the two range inputs into one combined field — anything. The selectors (`sanring-date-picker`, `sanring-date-range-picker`) are just component metadata; rename them if you want to avoid colliding with a black-box install used elsewhere in the same app.

The one thing that doesn't move is the boundary at `CalendarEngine`'s public API (`selectDate()`, `monthGrids()`, `abortRangeDraft()`, ...): that's where the state machine, keyboard navigation, and WAI-ARIA guarantees actually live. Reimplementing that from scratch instead of importing the engine means losing all of it — copy mode transfers the shell, not that responsibility (`.claude/constitutions/date-picker.md` R5).

## API reference

### `DatePickerComponent` (`sanring-date-picker`)

| Input/Output    | Type                                | Default                                         |                             |
| --------------- | ----------------------------------- | ----------------------------------------------- | --------------------------- |
| `selectedDate`  | `model<Date \| null>`               | `null`                                          | two-way, `[(selectedDate)]` |
| `locale`        | `input.required<CalendarLocale>`    | —                                               |                             |
| `disabled`      | `input<DisabledInput \| undefined>` | `undefined`                                     |                             |
| `allowDeselect` | `input<boolean>`                    | `false`                                         |                             |
| `today`         | `input<Date \| undefined>`          | falls back to engine's `CALENDAR_TODAY`         |                             |
| `format`        | `input<DateFormatConfig>`           | `DEFAULT_DATE_FORMAT_CONFIG` (ISO `yyyy-MM-dd`) |                             |
| `placeholder`   | `input<string>`                     | `''`                                            |                             |
| `openedChange`  | `output<boolean>`                   | —                                               | overlay open/close          |

### `DateRangePickerComponent` (`sanring-date-range-picker`)

Same `locale` / `disabled` / `today` / `format` / `placeholder` / `openedChange` as above, plus:

| Input/Output         | Type                                     | Default                      |                                                     |
| -------------------- | ---------------------------------------- | ---------------------------- | --------------------------------------------------- |
| `selectedRange`      | `model<DateRange>`                       | `{ start: null, end: null }` | two-way, `[(selectedRange)]`                        |
| `rangeDayCountLimit` | `input<RangeDayCountLimit \| undefined>` | `undefined`                  |                                                     |
| `monthsToDisplay`    | `input<number>`                          | `2`                          | dual-month by default (engine itself defaults to 1) |
| `triggerMode`        | `input<'split' \| 'combined'>`           | `'split'`                    | split start/end inputs or one combined trigger      |

### Types

```ts
interface DateFormatConfig {
  format: (date: Date) => string;
  parse: (value: string) => Date | null; // null on failure — never throws, never guesses
}

const DEFAULT_DATE_FORMAT_CONFIG: DateFormatConfig; // ISO yyyy-MM-dd, date-fns backed

type DatePickerWidgetTheme = Record<`--dp-${string}`, string>; // type hint for --dp-* overrides, not enforced at runtime
```

`CalendarLocale`, `DisabledInput`, `DateRange`, `RangeDayCountLimit` are re-exported from `@sanring/date-picker-core` — see [that package's README](../date-picker/README.md) for their shapes.

## Out of scope

- No natural-language date parsing — `format`/`parse` require an explicit format, never guessed
- No `minDate`/`maxDate` business rules built in — express them via `disabled` (`DisabledInput`), same as the engine
- No precompiled CSS bundle yet — Tailwind v4 is currently required in the consuming app either way; planned, not yet built
- No CLI scaffolding tool for copy mode — this README plus the source under `src/lib` is the whole story, by design (`.claude/prds/date-picker-widget.md` §5: copy mode is intentionally docs + repo, not tooling)

## Docs

- Business rules (source of truth): `.claude/constitutions/date-picker.md`
- Product/technical spec: `.claude/prds/date-picker-widget.md`
- Engine this package builds on: `.claude/prds/date-picker.md`, [`projects/date-picker-core/README.md`](../date-picker-core/README.md)
