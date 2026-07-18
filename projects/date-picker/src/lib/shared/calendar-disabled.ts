import { isSameDay } from 'date-fns/isSameDay';
import { startOfDay } from 'date-fns/startOfDay';
import type { DateMatcher, DisabledInput } from './calendar.types';

/**
 * Does `date` hit this single matcher (R4 / Decision 5 — one of the four
 * unified matcher shapes)? Day-granularity throughout: a DateInterval's
 * `from`/`to` are compared as whole days, regardless of their time-of-day,
 * and a reversed interval (to before from) is normalized rather than
 * silently matching nothing.
 */
export function isDateMatch(date: Date, matcher: DateMatcher): boolean {
  if (typeof matcher === 'function') {
    return matcher(date);
  }
  if (Array.isArray(matcher)) {
    return matcher.some((candidate) => isSameDay(date, candidate));
  }
  if (matcher instanceof Date) {
    return isSameDay(date, matcher);
  }

  const day = startOfDay(date).getTime();
  const from = startOfDay(matcher.from).getTime();
  const to = startOfDay(matcher.to).getTime();
  const [start, end] = from <= to ? [from, to] : [to, from];
  return day >= start && day <= end;
}

/**
 * Does `date` hit any matcher in `input`? A single matcher and a
 * `DateMatcher[]` are both accepted; an array is OR-combined (R4 / Decision 5).
 */
export function isDisabledByAny(date: Date, input: DisabledInput): boolean {
  if (Array.isArray(input)) {
    return input.some((matcher) => isDateMatch(date, matcher));
  }
  return isDateMatch(date, input);
}
