import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { CALENDAR_LOCALE, CALENDAR_QUARTER_STARTS_ON, CALENDAR_TODAY } from '@sanring/date-picker';
import type { CalendarLocale } from '@sanring/date-picker';

import { routes } from './app.routes';

const zhTwLocale: CalendarLocale = {
  weekStartsOn: 1,
  weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
  monthLabels: [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ],
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: CALENDAR_LOCALE, useValue: zhTwLocale },
    { provide: CALENDAR_TODAY, useValue: () => new Date(2026, 6, 13) },
    { provide: CALENDAR_QUARTER_STARTS_ON, useValue: 3 },
  ],
};
