import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CALENDAR_TODAY } from '@sanring/date-picker';
import type { CalendarLocale, DateInterval, DateRange } from '@sanring/date-picker';
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
const EMPTY_RANGE: DateRange = { start: null, end: null };

@Component({
  imports: [DateRangePickerComponent],
  template: `
    <sanring-date-range-picker
      [locale]="locale"
      [(selectedRange)]="selectedRange"
      [disabled]="disabled()"
      [format]="format()"
      [triggerMode]="triggerMode()"
      placeholder="pick a date"
    />
  `,
})
class TestHostComponent {
  readonly picker = viewChild.required(DateRangePickerComponent);
  locale = testLocale;
  readonly selectedRange = signal<DateRange>(EMPTY_RANGE);
  readonly disabled = signal<DateInterval | undefined>(undefined);
  readonly format = signal<DateFormatConfig>(DEFAULT_DATE_FORMAT_CONFIG);
  readonly triggerMode = signal<'split' | 'combined'>('split');
}

describe('DateRangePickerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  function startInputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelectorAll('input')[0];
  }

  function endInputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelectorAll('input')[1];
  }

  function combinedInputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelectorAll('input')[2];
  }

  function dayButton(iso: string): HTMLButtonElement | null {
    return document.querySelector(`button[aria-label^="${iso}"]`);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: CALENDAR_TODAY, useValue: () => fixedToday }],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('starts closed with empty inputs showing the placeholder', () => {
    expect(startInputEl().value).toBe('');
    expect(endInputEl().value).toBe('');
    expect(startInputEl().placeholder).toBe('pick a date');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the overlay when either input gains focus', () => {
    endInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('renders two months side by side by default', () => {
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(document.querySelectorAll('[role="grid"]').length).toBe(2);
  });

  it('supports a combined trigger that opens the dual-month overlay and displays the committed range', () => {
    host.triggerMode.set('combined');
    fixture.detectChanges();

    combinedInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(document.querySelectorAll('[role="grid"]').length).toBe(2);

    dayButton('2026-02-10')!.click();
    fixture.detectChanges();
    dayButton('2026-02-14')!.click();
    fixture.detectChanges();

    expect(host.selectedRange()).toEqual({
      start: new Date(2026, 1, 10),
      end: new Date(2026, 1, 14),
    });
    expect(combinedInputEl().value).toBe('2026-02-10 ~ 2026-02-14');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('first pick opens a Draft: shows the start date, keeps the overlay open, leaves the model untouched', () => {
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-10')!.click();
    fixture.detectChanges();

    expect(host.selectedRange()).toEqual(EMPTY_RANGE);
    expect(startInputEl().value).toBe('2026-02-10');
    expect(endInputEl().value).toBe('');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('second pick commits the range, formats both inputs, and closes the overlay', () => {
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    fixture.detectChanges();

    dayButton('2026-02-14')!.click();
    fixture.detectChanges();

    expect(host.selectedRange()).toEqual({
      start: new Date(2026, 1, 10),
      end: new Date(2026, 1, 14),
    });
    expect(startInputEl().value).toBe('2026-02-10');
    expect(endInputEl().value).toBe('2026-02-14');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reflects an externally-set model value into the engine and both inputs', () => {
    host.selectedRange.set({ start: new Date(2026, 1, 5), end: new Date(2026, 1, 8) });
    fixture.detectChanges();

    expect(startInputEl().value).toBe('2026-02-05');
    expect(endInputEl().value).toBe('2026-02-08');
  });

  it('does not draft a disabled date', () => {
    host.disabled.set({ from: new Date(2026, 1, 18), to: new Date(2026, 1, 20) });
    fixture.detectChanges();

    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-19')!.click();
    fixture.detectChanges();

    expect(startInputEl().value).toBe('');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('Escape during an active Draft aborts the Draft but keeps the overlay open', () => {
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    fixture.detectChanges();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(startInputEl().value).toBe('');
  });

  it('Escape with no active Draft closes the overlay and returns focus to the last-focused input', () => {
    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('backdrop click during an active Draft aborts the Draft, closes the overlay, and keeps prior committed values', () => {
    host.selectedRange.set({ start: new Date(2026, 1, 5), end: new Date(2026, 1, 8) });
    fixture.detectChanges();

    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click(); // starts a new Draft on top of the committed range
    fixture.detectChanges();
    expect(startInputEl().value).toBe('2026-02-10');

    const backdrop = document.querySelector('.cdk-overlay-backdrop') as HTMLElement;
    backdrop.click();
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(host.selectedRange()).toEqual({
      start: new Date(2026, 1, 5),
      end: new Date(2026, 1, 8),
    });
    expect(startInputEl().value).toBe('2026-02-05');
    expect(endInputEl().value).toBe('2026-02-08');
  });

  it('honors a custom format input for both display and typed parsing', () => {
    host.format.set({
      format: (date) => `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
      parse: (value) => {
        const [day, month, year] = value.split('/').map(Number);
        return day && month && year ? new Date(year, month - 1, day) : null;
      },
    });
    fixture.detectChanges();

    startInputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    fixture.detectChanges();
    dayButton('2026-02-14')!.click();
    fixture.detectChanges();

    expect(startInputEl().value).toBe('10/2/2026');
    expect(endInputEl().value).toBe('14/2/2026');
  });

  it('typing a valid pair into both inputs commits the range', () => {
    const start = startInputEl();
    start.value = '2026-02-03';
    start.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const end = endInputEl();
    end.value = '2026-02-06';
    end.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.selectedRange()).toEqual({
      start: new Date(2026, 1, 3),
      end: new Date(2026, 1, 6),
    });
    expect(end.getAttribute('aria-invalid')).toBeNull();
  });

  it('marks aria-invalid on an unparseable typed value without committing', () => {
    const start = startInputEl();
    start.value = 'not-a-date';
    start.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(start.getAttribute('aria-invalid')).toBe('true');
    expect(host.selectedRange()).toEqual(EMPTY_RANGE);
  });
});
