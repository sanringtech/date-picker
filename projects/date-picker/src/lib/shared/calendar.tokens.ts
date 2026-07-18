import { InjectionToken } from '@angular/core';
import type { CalendarLocale, QuarterStartMonth } from './calendar.types';

/**
 * Localization contract. Deliberately has NO default factory and is NOT
 * `providedIn: 'root'` — injecting this without an app-level provider must
 * throw (Angular's NullInjectorError), forcing the consumer to make an
 * explicit localization choice instead of silently inheriting a hidden
 * language/region default (constitution I4 / Decision 7).
 */
export const CALENDAR_LOCALE = new InjectionToken<CalendarLocale>('CALENDAR_LOCALE');

/**
 * "What counts as today" basis. Highest priority is whatever the host app
 * injects (e.g. a fixed SSR render timestamp); absent that, falls back to
 * the environment clock. The engine trusts this 100% and performs no SSR
 * detection or hydration compensation of its own (constitution Decision 4 / §9).
 */
export const CALENDAR_TODAY = new InjectionToken<() => Date>('CALENDAR_TODAY', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/**
 * Quarter start month for GranularityPickerEngine's quarter grid (Decision 12).
 * Deliberately has NO default factory — same reasoning as CALENDAR_LOCALE: which
 * month a "quarter" starts on (calendar vs fiscal) is a business convention, not
 * a neutral fact, so injecting this without an app-level provider must throw
 * rather than silently assuming a calendar quarter (ADR-0001 sub-decision 1).
 */
export const CALENDAR_QUARTER_STARTS_ON = new InjectionToken<QuarterStartMonth>(
  'CALENDAR_QUARTER_STARTS_ON',
);
