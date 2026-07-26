/**
 * WAI-ARIA compliance tests using axe-core (W4 acceptance gate, widget PRD §10).
 *
 * Mirrors the engine's `calendar-a11y.spec.ts` pattern, applied to the composed
 * `DatePickerComponent`/`DateRangePickerComponent` (Input + CDK Overlay dialog).
 * The overlay's dialog content is portaled into a global CDK overlay container
 * appended to `document.body`, not into the fixture's own DOM subtree — so
 * every scan here targets `document.body` (a superset that also covers the
 * fixture-rendered input(s)), matching how the existing component specs query
 * the dialog via `document.querySelector('[role="dialog"]')`.
 */

import axe from 'axe-core';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CALENDAR_TODAY } from '@sanring/date-picker';
import type { CalendarLocale, DateInterval, DateRange } from '@sanring/date-picker';
import { DatePickerComponent } from './date-picker.component';
import { DateRangePickerComponent } from './date-range-picker.component';
import { DEFAULT_DATE_FORMAT_CONFIG, type DateFormatConfig } from './date-format';

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

const fixedToday = new Date(2026, 1, 15); // 2026-02-15

async function runAxe(el: Element): Promise<axe.AxeResults> {
  return axe.run(el, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'best-practice'],
    },
    // 'region' checks that all *page* content sits inside a landmark (<main>,
    // <nav>, ...) — a page-authoring concern owned by the consuming app, not
    // this widget. Scanning document.body (required to reach the CDK-portaled
    // dialog) would otherwise flag the bare input(s) for a violation that has
    // nothing to do with the widget itself.
    rules: { region: { enabled: false } },
  });
}

function violationSummary(results: axe.AxeResults): string {
  if (results.violations.length === 0) return '';
  return results.violations
    .map((v) => `[${v.id}] ${v.description}: ${v.nodes.map((n) => n.html).join(', ')}`)
    .join('\n');
}

function dayButton(iso: string): HTMLButtonElement | null {
  return document.querySelector(`button[aria-label^="${iso}"]`);
}

// ---------------------------------------------------------------------------
// DatePickerComponent (single mode)
// ---------------------------------------------------------------------------

@Component({
  imports: [DatePickerComponent],
  template: `
    <sanring-date-picker
      [locale]="locale"
      [(selectedDate)]="selectedDate"
      [disabled]="disabled()"
      [format]="format()"
      placeholder="pick a date"
    />
  `,
})
class SingleHostComponent {
  readonly picker = viewChild.required(DatePickerComponent);
  locale = testLocale;
  readonly selectedDate = signal<Date | null>(null);
  readonly disabled = signal<DateInterval | undefined>(undefined);
  readonly format = signal<DateFormatConfig>(DEFAULT_DATE_FORMAT_CONFIG);
}

describe('DatePickerComponent WAI-ARIA (W4 axe-core gate)', () => {
  let fixture: ComponentFixture<SingleHostComponent>;
  let host: SingleHostComponent;

  function inputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SingleHostComponent],
      providers: [{ provide: CALENDAR_TODAY, useValue: () => fixedToday }],
    });
    fixture = TestBed.createComponent(SingleHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('closed, empty state: axe finds zero violations', async () => {
    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('overlay open, no selection: axe finds zero violations', async () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('overlay open with a selected date: axe finds zero violations', async () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-20')!.click();
    fixture.detectChanges();
    // Re-open to scan the grid with the selection reflected (selectDate() auto-closes).
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('overlay open with disabled dates (I2): axe finds zero violations', async () => {
    host.disabled.set({ from: new Date(2026, 1, 18), to: new Date(2026, 1, 20) });
    fixture.detectChanges();
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('invalid (unparseable) input text: axe finds zero violations', async () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    const input = inputEl();
    input.value = 'not-a-date';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DateRangePickerComponent (range mode)
// ---------------------------------------------------------------------------

const EMPTY_RANGE: DateRange = { start: null, end: null };

@Component({
  imports: [DateRangePickerComponent],
  template: `
    <sanring-date-range-picker
      [locale]="locale"
      [(selectedRange)]="selectedRange"
      [disabled]="disabled()"
      [format]="format()"
      placeholder="pick a date"
    />
  `,
})
class RangeHostComponent {
  readonly picker = viewChild.required(DateRangePickerComponent);
  locale = testLocale;
  readonly selectedRange = signal<DateRange>(EMPTY_RANGE);
  readonly disabled = signal<DateInterval | undefined>(undefined);
  readonly format = signal<DateFormatConfig>(DEFAULT_DATE_FORMAT_CONFIG);
}

describe('DateRangePickerComponent WAI-ARIA (W4 axe-core gate)', () => {
  let fixture: ComponentFixture<RangeHostComponent>;
  let host: RangeHostComponent;

  function startInputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelectorAll('input')[0];
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RangeHostComponent],
      providers: [{ provide: CALENDAR_TODAY, useValue: () => fixedToday }],
    });
    fixture = TestBed.createComponent(RangeHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('closed, empty state: axe finds zero violations', async () => {
    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('overlay open, two-month grid, no selection: axe finds zero violations', async () => {
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('overlay open with an in-progress Draft (start picked, end pending): axe finds zero violations', async () => {
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    fixture.detectChanges();

    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('overlay reopened with a committed range: axe finds zero violations', async () => {
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    fixture.detectChanges();
    dayButton('2026-02-20')!.click();
    fixture.detectChanges();
    // selectDate() auto-closes once the pair commits — reopen to scan the
    // grid with the committed range (isInRange/isSelected) reflected.
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });

  it('overlay open with disabled dates (I2): axe finds zero violations', async () => {
    host.disabled.set({ from: new Date(2026, 1, 18), to: new Date(2026, 1, 20) });
    fixture.detectChanges();
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const results = await runAxe(document.body);
    expect(results.violations, violationSummary(results)).toHaveLength(0);
  });
});
