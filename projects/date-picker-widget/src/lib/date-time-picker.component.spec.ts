import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CALENDAR_TODAY } from '@sanring/date-picker';
import type { CalendarLocale, DateInterval } from '@sanring/date-picker';
import { DateTimePickerComponent } from './date-time-picker.component';

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
  imports: [DateTimePickerComponent],
  template: `
    <sanring-date-time-picker
      [locale]="locale"
      [(selectedDate)]="selectedDate"
      [disabled]="disabled()"
      placeholder="pick a date and time"
    />
  `,
})
class TestHostComponent {
  readonly picker = viewChild.required(DateTimePickerComponent);
  locale = testLocale;
  readonly selectedDate = signal<Date | null>(null);
  readonly disabled = signal<DateInterval | undefined>(undefined);
}

describe('DateTimePickerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  function inputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function dayButton(iso: string): HTMLButtonElement | null {
    return document.querySelector(`button[aria-label="${iso}"]`);
  }

  function confirmButton(): HTMLButtonElement {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === '確認',
    )!;
  }

  function abortButton(): HTMLButtonElement {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === '中止',
    )!;
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
    expect(inputEl().placeholder).toBe('pick a date and time');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not commit to the model until confirmTime is pressed (Draft/Confirm)', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-20')!.click();
    fixture.detectChanges();

    // Still nothing on the model — only a Draft exists.
    expect(host.selectedDate()).toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(confirmButton()).toBeTruthy();
  });

  it('composes date + adjusted time into the model on confirm, and closes the overlay', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-20')!.click();
    fixture.detectChanges();

    const hourUp = document.querySelector<HTMLButtonElement>('button[aria-label="增加小時"]')!;
    hourUp.click();
    hourUp.click();
    fixture.detectChanges();
    const minuteUp = document.querySelector<HTMLButtonElement>('button[aria-label="增加分鐘"]')!;
    minuteUp.click();
    fixture.detectChanges();

    confirmButton().click();
    fixture.detectChanges();

    expect(host.selectedDate()).toEqual(new Date(2026, 1, 20, 2, 1, 0));
    expect(inputEl().value).toBe('2026-02-20 02:01');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reverts to the prior committed value on abort without touching the model', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-20')!.click();
    fixture.detectChanges();
    confirmButton().click();
    fixture.detectChanges();

    const committed = host.selectedDate();

    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-25')!.click();
    fixture.detectChanges();
    const hourUp = document.querySelector<HTMLButtonElement>('button[aria-label="增加小時"]')!;
    hourUp.click();
    fixture.detectChanges();

    abortButton().click();
    fixture.detectChanges();

    expect(host.selectedDate()).toEqual(committed);
    // Aborting doesn't close the overlay — matches Range's Escape-aborts-first precedent.
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('does not open a draft for a disabled day', () => {
    host.disabled.set({ from: new Date(2026, 1, 18), to: new Date(2026, 1, 20) });
    fixture.detectChanges();

    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    dayButton('2026-02-19')!.click();
    fixture.detectChanges();

    expect(document.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(confirmButton()).toBeUndefined();
  });

  it('reflects an externally-set model value into the engine and input text', () => {
    host.selectedDate.set(new Date(2026, 1, 22, 9, 30));
    fixture.detectChanges();

    expect(inputEl().value).toBe('2026-02-22 09:30');
  });

  it('aborts the draft and closes the overlay on Escape when no draft is pending', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Escape aborts an in-progress draft first, keeping the overlay open', () => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    dayButton('2026-02-20')!.click();
    fixture.detectChanges();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(confirmButton()).toBeUndefined();
  });
});
