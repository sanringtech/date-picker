import type { Granularity } from './calendar.types';

export type DayGranularity = Extract<Granularity, 'day'>;
export type PeriodGranularity = Exclude<Granularity, 'day'>;
export type GranularityEngineKind = 'calendar' | 'period';

export function isDayGranularity(granularity: Granularity): granularity is DayGranularity {
  return granularity === 'day';
}

export function isPeriodGranularity(granularity: Granularity): granularity is PeriodGranularity {
  return granularity !== 'day';
}

export function engineKindForGranularity(granularity: Granularity): GranularityEngineKind {
  return isDayGranularity(granularity) ? 'calendar' : 'period';
}
