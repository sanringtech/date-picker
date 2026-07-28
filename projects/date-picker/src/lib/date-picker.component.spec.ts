import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CALENDAR_TODAY } from '@sanring/date-picker-core';
import type { CalendarLocale, DateInterval } from '@sanring/date-picker-core';
import { DatePickerComponent } from './date-picker.component';
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
class TestHostComponent {
  readonly picker = viewChild.required(DatePickerComponent);
  locale = testLocale;
  // Plain field mutations aren't observed by this zoneless app's change
  // detection — only signal writes and real DOM events are, so any host
  // state a test needs to mutate externally (not via simulated user
  // interaction) must be a signal, exactly as a real consuming app's own
  // component would need to hold its own bound state in a signal too.
  readonly selectedDate = signal<Date | null>(null);
  readonly disabled = signal<DateInterval | undefined>(undefined);
  readonly format = signal<DateFormatConfig>(DEFAULT_DATE_FORMAT_CONFIG);
}

describe('DatePickerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  function inputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function dayButton(iso: string): HTMLButtonElement | null {
    return document.querySelector(`button[aria-label="${iso}"]`);
  }

  function engineOf(picker: DatePickerComponent): { selectedDate(): Date | null } {
    return (picker as unknown as { engine: { selectedDate(): Date | null } }).engine;
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

  it('starts closed with an empty input showing the placeholder', () => {
    expect(inputEl().value).toBe('');
    expect(inputEl().placeholder).toBe('pick a date');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the overlay when the input gains focus', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('selecting a day updates the model, formats the input, and closes the overlay', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-20')!.click();
    fixture.detectChanges();

    expect(host.selectedDate()).toEqual(new Date(2026, 1, 20));
    expect(inputEl().value).toBe('2026-02-20');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reflects an externally-set model value into the engine and input text', () => {
    host.selectedDate.set(new Date(2026, 1, 22));
    fixture.detectChanges();

    expect(inputEl().value).toBe('2026-02-22');
    expect(engineOf(host.picker()).selectedDate()).toEqual(new Date(2026, 1, 22));
  });

  it('does not select a disabled date', () => {
    host.disabled.set({ from: new Date(2026, 1, 18), to: new Date(2026, 1, 20) });
    fixture.detectChanges();

    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-19')!.click();
    fixture.detectChanges();

    expect(host.selectedDate()).toBeNull();
    expect(inputEl().value).toBe('');
  });

  it('honors a custom format input for both display and parsing', () => {
    host.format.set({
      format: (date) => `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
      parse: (value) => {
        const [day, month, year] = value.split('/').map(Number);
        return day && month && year ? new Date(year, month - 1, day) : null;
      },
    });
    fixture.detectChanges();

    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-20')!.click();
    fixture.detectChanges();

    expect(inputEl().value).toBe('20/2/2026');
  });

  it('marks aria-invalid when typing an unparseable string, without clearing the prior selection', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    fixture.detectChanges();

    const input = inputEl();
    input.value = 'not-a-date';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(engineOf(host.picker()).selectedDate()).toEqual(new Date(2026, 1, 10));
  });

  it('closes the overlay on Escape and returns focus to the input', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
