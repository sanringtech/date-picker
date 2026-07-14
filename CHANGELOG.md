# Changelog

All notable changes to `@sanring/date-picker` are documented here.

## [0.1.0] — 2026-07-14

First public release. Covers M0–M4 of the initial roadmap.

### Added

**M0 — Workspace bootstrap**
- Angular CLI workspace with `ng generate library` scaffolding
- ng-packagr build producing Angular Package Format (FESM2022 + `.d.ts`)
- Vitest test runner (Angular 22 default)
- ESLint + Prettier configuration

**M1 — Core engine (tracer bullet)**
- `CalendarEngine` injectable (component-scoped) with Angular Signals state
- `CALENDAR_LOCALE` injection token — no built-in default, forces explicit locale choice
- `CALENDAR_TODAY` injection token — defaults to `() => new Date()`, overridable for SSR
- 42-day fixed grid computation (`monthGrids` signal, length invariant I3)
- Single-date selection state machine with configurable `allowDeselect`
- Month navigation: `nextMonth()` / `prevMonth()` / `setViewDate()`
- `clearSelection()` — clears selection without touching `viewDate`
- `CalendarGridDirective` (`[sanringCalendarGrid]`) — keyboard handler (Arrow/Home/End/PageUp/PageDown/Enter/Space)
- Demo app (`projects/demo`) with Tailwind CSS

**M2 — Disabled dates**
- `DisabledInput` unified matcher: single `Date`, `Date[]`, `DateInterval`, predicate function, or OR-combined array
- `setDisabled()` / `isDateDisabled()` on `CalendarEngine`
- I2 invariant enforcement: `selectDate()` is no-op on disabled dates; `setDisabled()` proactively clears any conflicting existing selection
- `CALENDAR_TODAY` fixed-injection demo scenario

**M3 — Range selection**
- Range selection state machine: first click → Draft (`draftStart`), second click → commit (`selectedRange`)
- `isDraftActive` / `draftStart` signals
- `abortRangeDraft()` — discards draft without touching committed `selectedRange` (no snapshot/rollback needed by design)
- `Escape` key aborts draft in range mode; not consumed in single mode
- `CalendarDay.isInRange` reflects live draft preview using `focusedDate` as tentative end
- Auto-sort: picking end before start swaps so `start ≤ end`

**M4 — Multi-month grid + cross-month focus + WAI-ARIA**
- `setMonthsToDisplay(n)` — `monthGrids()` returns N parallel 42-cell arrays; `nextMonth()`/`prevMonth()` always slide by exactly one month
- `moveFocus()` operates on a flat N×42 index; crossing the visible window boundary auto-pages `prevMonth()`/`nextMonth()` and lands on the corresponding logical cell
- `Home`/`End` stay within the same week row and never cross a month boundary
- `PageUp`/`PageDown` carry focus to the same day-of-month, clamped to shorter months
- WAI-ARIA: `role="grid"` / `role="row"` / `role="gridcell"`, `aria-selected`, `aria-disabled`, `aria-label` wired in the demo
- `axe-core` WAI-ARIA compliance tests (5 scenarios, zero WCAG 2.x violations)
- GitHub Actions CI workflow: lint → format check → unit tests (axe included) → library build

### Bundle size

- Raw FESM2022: ~22 KB
- **Gzip: ~6.1 KB** (budget: < 15 KB ✅)
