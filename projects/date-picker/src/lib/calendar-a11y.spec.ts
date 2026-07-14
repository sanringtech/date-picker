/**
 * WAI-ARIA compliance tests using axe-core (M4 acceptance gate, PRD §10).
 *
 * Renders a minimal but complete calendar grid that mirrors the ARIA structure
 * described in the demo app (role=grid > role=row > role=gridcell) and asserts
 * zero axe violations for the core interaction scenarios.
 */

import axe from 'axe-core';
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarGridDirective } from './calendar-grid.directive';
import { CALENDAR_LOCALE, CALENDAR_TODAY } from './calendar.tokens';
import type { CalendarDay, CalendarLocale } from './calendar.types';

const testLocale: CalendarLocale = {
  weekStartsOn: 1,
  weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
  monthLabels: [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ],
};

const fixedToday = new Date(2026, 1, 15); // Sunday Feb 15 2026

/** Splits a flat 42-cell array into 6 week rows. */
function toWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < 42; i += 7) {
    weeks.push(grid.slice(i, i + 7) as CalendarDay[]);
  }
  return weeks;
}

function monthLabel(grid: readonly CalendarDay[], labels: readonly string[]): string {
  const cell = grid.find((d) => d.isCurrentMonth) ?? grid[0];
  return `${cell.date.getFullYear()} ${labels[cell.date.getMonth()]}`;
}

// ---------------------------------------------------------------------------
// Single-month calendar host
// ---------------------------------------------------------------------------

@Component({
  selector: 'sanring-a11y-host',
  imports: [CalendarGridDirective],
  template: `
    <div sanringCalendarGrid #grid="sanringCalendarGrid" tabindex="0" aria-label="日期選擇器">
      @for (monthGrid of grid.engine.monthGrids(); track $index) {
        <div
          role="grid"
          [attr.aria-label]="getMonthLabel(monthGrid)"
          [attr.aria-multiselectable]="false"
        >
          @for (week of getWeeks(monthGrid); track $index) {
            <div role="row" style="display:contents">
              @for (day of week; track day.date.getTime()) {
                <button
                  role="gridcell"
                  type="button"
                  [disabled]="day.isDisabled"
                  [attr.aria-selected]="day.isSelected ? true : null"
                  [attr.aria-disabled]="day.isDisabled ? true : null"
                  [attr.aria-label]="getCellLabel(day)"
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
class A11yHostComponent {
  @ViewChild(CalendarGridDirective, { static: true }) directive!: CalendarGridDirective;

  getWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
    return toWeeks(grid);
  }

  getMonthLabel(grid: readonly CalendarDay[]): string {
    return monthLabel(grid, testLocale.monthLabels);
  }

  getCellLabel(day: CalendarDay): string {
    const iso = day.date.toISOString().slice(0, 10);
    if (day.isDisabled) return `${iso}（不可選）`;
    if (day.isRangeStart) return `${iso}（區間起點）`;
    if (day.isRangeEnd) return `${iso}（區間終點）`;
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Two-month calendar host (Decision 8)
// ---------------------------------------------------------------------------

@Component({
  selector: 'sanring-a11y-multimonth-host',
  imports: [CalendarGridDirective],
  template: `
    <div sanringCalendarGrid #grid="sanringCalendarGrid" tabindex="0" aria-label="日期區間選擇器">
      @for (monthGrid of grid.engine.monthGrids(); track $index) {
        <div
          role="grid"
          [attr.aria-label]="getMonthLabel(monthGrid)"
          [attr.aria-multiselectable]="false"
        >
          @for (week of getWeeks(monthGrid); track $index) {
            <div role="row" style="display:contents">
              @for (day of week; track day.date.getTime()) {
                <button
                  role="gridcell"
                  type="button"
                  [disabled]="day.isDisabled"
                  [attr.aria-selected]="day.isSelected ? true : null"
                  [attr.aria-disabled]="day.isDisabled ? true : null"
                  [attr.aria-label]="getCellLabel(day)"
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
class A11yMultiMonthHostComponent {
  @ViewChild(CalendarGridDirective, { static: true }) directive!: CalendarGridDirective;

  getWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
    return toWeeks(grid);
  }

  getMonthLabel(grid: readonly CalendarDay[]): string {
    return monthLabel(grid, testLocale.monthLabels);
  }

  getCellLabel(day: CalendarDay): string {
    const iso = day.date.toISOString().slice(0, 10);
    if (day.isDisabled) return `${iso}（不可選）`;
    if (day.isRangeStart) return `${iso}（區間起點）`;
    if (day.isRangeEnd) return `${iso}（區間終點）`;
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function runAxe(el: Element): Promise<axe.AxeResults> {
  return axe.run(el, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'best-practice'],
    },
  });
}

function violationSummary(results: axe.AxeResults): string {
  if (results.violations.length === 0) return '';
  return results.violations
    .map((v) => `[${v.id}] ${v.description}: ${v.nodes.map((n) => n.html).join(', ')}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WAI-ARIA calendar grid (M4 axe-core gate)', () => {
  let fixture: ComponentFixture<A11yHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CALENDAR_LOCALE, useValue: testLocale },
        { provide: CALENDAR_TODAY, useValue: () => fixedToday },
      ],
    });
    fixture = TestBed.createComponent(A11yHostComponent);
    fixture.detectChanges();
  });

  it('single-month default state: axe finds zero WCAG 2.x violations', async () => {
    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('single-month with a selected date: axe finds zero violations', async () => {
    const { engine } = fixture.componentInstance.directive;
    engine.selectDate(new Date(2026, 1, 20));
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('single-month with disabled dates (I2): axe finds zero violations', async () => {
    const { engine } = fixture.componentInstance.directive;
    engine.setDisabled((d: Date) => d.getDay() === 0 || d.getDay() === 6);
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });
});

describe('WAI-ARIA multi-month grid (Decision 8 axe-core gate)', () => {
  let fixture: ComponentFixture<A11yMultiMonthHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CALENDAR_LOCALE, useValue: testLocale },
        { provide: CALENDAR_TODAY, useValue: () => fixedToday },
      ],
    });
    fixture = TestBed.createComponent(A11yMultiMonthHostComponent);
    fixture.detectChanges();
  });

  it('two-month range mode initial state: axe finds zero violations', async () => {
    const { engine } = fixture.componentInstance.directive;
    engine.setSelectionMode('range');
    engine.setMonthsToDisplay(2);
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('two-month range with a committed range: axe finds zero violations', async () => {
    const { engine } = fixture.componentInstance.directive;
    engine.setSelectionMode('range');
    engine.setMonthsToDisplay(2);
    engine.selectDate(new Date(2026, 1, 10));
    engine.selectDate(new Date(2026, 2, 5));
    fixture.detectChanges();

    const results = await runAxe(fixture.nativeElement);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });
});
