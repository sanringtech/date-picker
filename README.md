# @sanring/date-picker

Headless Angular calendar engine — pure logic, zero DOM/CSS assumptions. It computes the 42-day grid, selection state, and keyboard focus; you own every pixel of markup and styling (Tailwind, plain CSS, whatever).

Built on Angular Standalone + Signals, with `date-fns` for calendar math.

## Why headless

Off-the-shelf Angular datepickers (Material, PrimeNG, ...) couple appearance to logic. If your layout doesn't fit their component shape, you end up fighting CSS overrides or rewriting the whole thing. This package only does the "brain": inject `CalendarEngine`, bind `CalendarGridDirective` to your own markup, read the output signals, render however you like.

## Status

Early development, tracking `.claude/prds/date-picker.md`. Currently implemented (M1 tracer bullet):

- Single-month 42-day grid (`CalendarEngine.monthGrids`)
- Single-date selection with configurable re-click-to-deselect
- Month navigation (`nextMonth` / `prevMonth` / `setViewDate`)
- Locale injection via `CALENDAR_LOCALE` (no built-in default — you must provide one)
- "Today" injection via `CALENDAR_TODAY` (falls back to the system clock)
- Arrow-key/Home/End/PageUp/PageDown focus movement within the current grid (`CalendarGridDirective`)

Not yet implemented — see the PRD for the full roadmap: range selection, disabled-dates matchers, multi-month grids, cross-month focus auto-paging, full WAI-ARIA grid pattern.

Explicitly out of scope (permanent, not deferred): non-Gregorian calendars, date string parsing/formatting, timezone conversion, Year/Decade views, built-in popover/overlay chrome, built-in min/max-date business rules.

## Workspace layout

This is an Angular CLI workspace containing the publishable library plus (eventually) a demo app:

```
projects/
  date-picker/   the @sanring/date-picker library (projects/date-picker/src/lib)
```

## Development server

```bash
ng serve
```

Open `http://localhost:4200/`; the app reloads on source changes.

## Building the library

```bash
ng build date-picker
```

Output goes to `dist/date-picker` (Angular Package Format).

## Running unit tests

```bash
ng test
```

Runs with [Vitest](https://vitest.dev/).

## Linting / formatting

```bash
ng lint
npm run format        # prettier --write
npm run format:check
```

## Docs

- Business rules (source of truth): `.claude/constitutions/date-picker.md`
- Product/technical spec: `.claude/prds/date-picker.md`
