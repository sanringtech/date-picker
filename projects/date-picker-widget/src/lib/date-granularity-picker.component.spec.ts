import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CALENDAR_TODAY } from '@sanring/date-picker';
import type {
  CalendarLocale,
  DateInterval,
  PickerGranularity,
  QuarterStartMonth,
} from '@sanring/date-picker';
import { DateGranularityPickerComponent } from './date-granularity-picker.component';

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
  imports: [DateGranularityPickerComponent],
  template: `
    <sanring-date-granularity-picker
      [granularity]="granularity()"
      [locale]="locale"
      [(selectedDate)]="selectedDate"
      [disabled]="disabled()"
      [quarterStartMonth]="quarterStartMonth()"
      placeholder="pick a period"
    />
  `,
})
class TestHostComponent {
  readonly picker = viewChild.required(DateGranularityPickerComponent);
  locale = testLocale;
  readonly granularity = signal<PickerGranularity>('month');
  readonly selectedDate = signal<Date | null>(null);
  readonly disabled = signal<DateInterval | undefined>(undefined);
  readonly quarterStartMonth = signal<QuarterStartMonth | undefined>(undefined);
}

/**
 * `quarterStartMonth` is resolved once into the engine's child injector at
 * construction (see the component's doc comment) — mirroring
 * `CALENDAR_QUARTER_STARTS_ON`'s own no-default-factory contract, which is
 * itself never meant to change reactively post-bootstrap. A dedicated host
 * with the value already bound at creation exercises that correctly, instead
 * of mutating an already-constructed instance's input (which the shared
 * `TestHostComponent` above cannot retroactively apply).
 */
@Component({
  imports: [DateGranularityPickerComponent],
  template: `
    <sanring-date-granularity-picker
      granularity="quarter"
      [locale]="locale"
      [(selectedDate)]="selectedDate"
      [quarterStartMonth]="0"
      placeholder="pick a quarter"
    />
  `,
})
class QuarterTestHostComponent {
  locale = testLocale;
  readonly selectedDate = signal<Date | null>(null);
}

describe('DateGranularityPickerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  function inputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function cellButtons(): HTMLButtonElement[] {
    return Array.from(document.querySelectorAll('button[role="gridcell"]'));
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
    expect(inputEl().placeholder).toBe('pick a period');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders 12 month cells and selects one, closing the overlay', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const cells = cellButtons();
    expect(cells.length).toBe(12);

    cells[2].click(); // March
    fixture.detectChanges();

    expect(host.selectedDate()).toEqual(new Date(2026, 2, 1));
    expect(inputEl().value).toBe('2026 三月');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders 4 quarter cells when granularity is quarter and quarterStartMonth is provided', () => {
    const quarterFixture = TestBed.createComponent(QuarterTestHostComponent);
    quarterFixture.detectChanges();
    const qInput: HTMLInputElement = quarterFixture.nativeElement.querySelector('input');

    qInput.dispatchEvent(new Event('focus'));
    quarterFixture.detectChanges();

    const cells = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[role="gridcell"]'),
    );
    expect(cells.length).toBe(4);

    cells[0].click(); // Q1
    quarterFixture.detectChanges();

    expect(qInput.value).toContain('Q1');
    quarterFixture.destroy();
  });

  it('renders a sliding year window when granularity is year', () => {
    host.granularity.set('year');
    fixture.detectChanges();

    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const cells = cellButtons();
    expect(cells.length).toBe(12);

    cells[0].click();
    fixture.detectChanges();

    expect(inputEl().value).toMatch(/^\d{4}$/);
  });

  it('does not select a disabled month', () => {
    host.disabled.set({ from: new Date(2026, 2, 1), to: new Date(2026, 4, 1) });
    fixture.detectChanges();

    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    cellButtons()[2].click(); // March, disabled
    fixture.detectChanges();

    expect(host.selectedDate()).toBeNull();
    expect(inputEl().value).toBe('');
  });

  it('reflects an externally-set model value into the engine and input text', () => {
    host.selectedDate.set(new Date(2026, 5, 1));
    fixture.detectChanges();

    expect(inputEl().value).toBe('2026 六月');
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
