import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { CALENDAR_LOCALE, CALENDAR_QUARTER_STARTS_ON, CALENDAR_TODAY } from '@sanring/date-picker';
import type { CalendarLocale } from '@sanring/date-picker';

/**
 * Fixed "today" basis (Decision 4 / §9) — demonstrates the SSR-style
 * injection path instead of falling back to the environment clock. Any
 * consumer that needs a stable render timestamp (e.g. avoiding hydration
 * mismatch) provides CALENDAR_TODAY exactly like this.
 */
export const FIXED_TODAY = new Date(2026, 6, 13);

const zhTwLocale: CalendarLocale = {
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

/**
 * Fiscal year starting April (Decision 12 / PRD Story 11) — deliberately NOT
 * January, so the Quarter-picker demo visibly proves CALENDAR_QUARTER_STARTS_ON
 * was actually injected rather than silently defaulting to a calendar quarter
 * (there is no default — ADR-0001 sub-decision 1).
 */
const FISCAL_QUARTER_STARTS_ON = 3;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: CALENDAR_LOCALE, useValue: zhTwLocale },
    { provide: CALENDAR_TODAY, useValue: () => FIXED_TODAY },
    { provide: CALENDAR_QUARTER_STARTS_ON, useValue: FISCAL_QUARTER_STARTS_ON },
  ],
};
