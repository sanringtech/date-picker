import { TestBed } from '@angular/core/testing';
import { CALENDAR_LOCALE, CALENDAR_TODAY } from './calendar.tokens';
import type { CalendarLocale } from './calendar.types';

describe('CALENDAR_TODAY', () => {
  it('falls back to the environment clock when nothing is provided', () => {
    const todayFn = TestBed.inject(CALENDAR_TODAY);
    const result = todayFn();
    expect(Math.abs(result.getTime() - Date.now())).toBeLessThan(1000);
  });

  it('trusts an explicitly injected override instead of the environment clock', () => {
    const fixed = new Date(2026, 0, 1, 0, 0, 0);
    TestBed.configureTestingModule({
      providers: [{ provide: CALENDAR_TODAY, useValue: () => fixed }],
    });

    const todayFn = TestBed.inject(CALENDAR_TODAY);
    expect(todayFn()).toEqual(fixed);
  });
});

describe('CALENDAR_LOCALE', () => {
  it('throws when no provider is registered (no silent language/region default)', () => {
    expect(() => TestBed.inject(CALENDAR_LOCALE)).toThrow();
  });

  it('returns the injected locale when a provider is registered', () => {
    const locale: CalendarLocale = {
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
    TestBed.configureTestingModule({
      providers: [{ provide: CALENDAR_LOCALE, useValue: locale }],
    });

    expect(TestBed.inject(CALENDAR_LOCALE)).toEqual(locale);
  });
});
