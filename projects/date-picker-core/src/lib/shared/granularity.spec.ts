import {
  engineKindForGranularity,
  isDayGranularity,
  isPeriodGranularity,
  type PeriodGranularity,
} from './granularity';

describe('granularity contract', () => {
  it('routes day granularity to the calendar engine', () => {
    expect(isDayGranularity('day')).toBe(true);
    expect(isPeriodGranularity('day')).toBe(false);
    expect(engineKindForGranularity('day')).toBe('calendar');
  });

  it.each<PeriodGranularity>(['month', 'quarter', 'year'])(
    'routes %s granularity to the period engine',
    (granularity) => {
      expect(isDayGranularity(granularity)).toBe(false);
      expect(isPeriodGranularity(granularity)).toBe(true);
      expect(engineKindForGranularity(granularity)).toBe('period');
    },
  );
});
