import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { CALENDAR_LOCALE } from '@sanring/date-picker';
import type { CalendarLocale } from '@sanring/date-picker';

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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: CALENDAR_LOCALE, useValue: zhTwLocale },
  ],
};
