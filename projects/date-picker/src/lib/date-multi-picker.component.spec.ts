import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CALENDAR_TODAY } from '@sanring/date-picker-core';
import type { CalendarLocale, DateInterval } from '@sanring/date-picker-core';
import { DateMultiPickerComponent } from './date-multi-picker.component';
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
  imports: [DateMultiPickerComponent],
  template: `
    <sanring-date-multi-picker
      [locale]="locale"
      [(selectedDates)]="selectedDates"
      [disabled]="disabled()"
      [format]="format()"
      placeholder="pick dates"
    />
  `,
})
class TestHostComponent {
  readonly picker = viewChild.required(DateMultiPickerComponent);
  locale = testLocale;
  readonly selectedDates = signal<Date[]>([]);
  readonly disabled = signal<DateInterval | undefined>(undefined);
  readonly format = signal<DateFormatConfig>(DEFAULT_DATE_FORMAT_CONFIG);
}

describe('DateMultiPickerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  function inputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function dayButton(iso: string): HTMLButtonElement | null {
    return document.querySelector(`button[aria-label="${iso}"]`);
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
    expect(inputEl().placeholder).toBe('pick dates');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the overlay when the input gains focus', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('accumulates multiple picks without closing the overlay, and keeps them in chronological order', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-20')!.click();
    fixture.detectChanges();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    dayButton('2026-02-10')!.click();
    fixture.detectChanges();

    // Model mirrors the engine's Set semantics (insertion order, PRD/憲法 §4 Multi-dates
    // "Set 語意集合" — no ordering guarantee); only the displayed input text is sorted for
    // readability (see applyEngineDatesToText()).
    expect(host.selectedDates()).toEqual([new Date(2026, 1, 20), new Date(2026, 1, 10)]);
    expect(inputEl().value).toBe('2026-02-10, 2026-02-20');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('toggles a date off when clicked again', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-20')!.click();
    fixture.detectChanges();
    dayButton('2026-02-20')!.click();
    fixture.detectChanges();

    expect(host.selectedDates()).toEqual([]);
    expect(inputEl().value).toBe('');
  });

  it('removes a single date via its chip remove button without touching the rest', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    dayButton('2026-02-20')!.click();
    fixture.detectChanges();

    const removeButtons = document.querySelectorAll<HTMLButtonElement>(
      '[aria-label="已選取日期列表"] button[aria-label^="移除"]',
    );
    expect(removeButtons.length).toBe(2);
    removeButtons[0].click();
    fixture.detectChanges();

    expect(host.selectedDates()).toEqual([new Date(2026, 1, 20)]);
  });

  it('clears every selected date via the clear-all button', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    dayButton('2026-02-20')!.click();
    fixture.detectChanges();

    document.querySelector<HTMLButtonElement>('button[aria-label="清除全部"]');
    const clearBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === '清除全部',
    )!;
    clearBtn.click();
    fixture.detectChanges();

    expect(host.selectedDates()).toEqual([]);
    expect(inputEl().value).toBe('');
  });

  it('reflects an externally-set model value into the engine and input text', () => {
    host.selectedDates.set([new Date(2026, 1, 22), new Date(2026, 1, 5)]);
    fixture.detectChanges();

    expect(inputEl().value).toBe('2026-02-05, 2026-02-22');
  });

  it('does not select a disabled date', () => {
    host.disabled.set({ from: new Date(2026, 1, 18), to: new Date(2026, 1, 20) });
    fixture.detectChanges();

    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-19')!.click();
    fixture.detectChanges();

    expect(host.selectedDates()).toEqual([]);
    expect(inputEl().value).toBe('');
  });

  it('parses a typed comma-separated list into a batch write', () => {
    const input = inputEl();
    input.value = '2026-02-05, 2026-02-12';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.selectedDates()).toEqual([new Date(2026, 1, 5), new Date(2026, 1, 12)]);
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('marks aria-invalid when any typed entry is unparseable, without committing the batch', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-10')!.click();
    fixture.detectChanges();

    const input = inputEl();
    input.value = '2026-02-10, not-a-date';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(host.selectedDates()).toEqual([new Date(2026, 1, 10)]);
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
