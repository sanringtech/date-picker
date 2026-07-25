import { format as formatDate, isValid, parse as parseDate } from 'date-fns';

/** Date string format setting (explicit format only, never guessed — see PRD §3 non-goals). */
export interface DateFormatConfig {
  /** Format Date → string. */
  format: (date: Date) => string;
  /** Parse string → Date; returns null on failure, never throws or guesses. */
  parse: (value: string) => Date | null;
}

/**
 * Built-in default used when the `format` input is omitted. Fixed ISO
 * `yyyy-MM-dd` — deliberately independent of `CalendarLocale` (locale governs
 * grid rendering only, not the input string format). 100% overridable via the
 * `format` input (constitution I5).
 */
export const DEFAULT_DATE_FORMAT_CONFIG: DateFormatConfig = {
  format: (date) => formatDate(date, 'yyyy-MM-dd'),
  parse: (value) => {
    const parsed = parseDate(value, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? parsed : null;
  },
};

/** CSS Custom Property overrides for the black-box (npm install) theming path. */
export type DatePickerWidgetTheme = Record<`--dp-${string}`, string>;
