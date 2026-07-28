import { isDateMatch, isDisabledByAny } from './calendar-disabled';

describe('isDateMatch', () => {
  it('matches a single Date matcher on the same day, ignoring time-of-day', () => {
    const matcher = new Date(2026, 1, 20, 23, 59);
    expect(isDateMatch(new Date(2026, 1, 20, 0, 0), matcher)).toBe(true);
    expect(isDateMatch(new Date(2026, 1, 21), matcher)).toBe(false);
  });

  it('matches a Date[] matcher when any element is the same day', () => {
    const matcher = [new Date(2026, 1, 1), new Date(2026, 1, 14), new Date(2026, 11, 25)];
    expect(isDateMatch(new Date(2026, 1, 14), matcher)).toBe(true);
    expect(isDateMatch(new Date(2026, 1, 15), matcher)).toBe(false);
  });

  it('matches a DateInterval matcher inclusively at both boundaries', () => {
    const matcher = { from: new Date(2026, 0, 26), to: new Date(2026, 0, 30) };
    expect(isDateMatch(new Date(2026, 0, 26), matcher)).toBe(true); // start boundary
    expect(isDateMatch(new Date(2026, 0, 28), matcher)).toBe(true); // middle
    expect(isDateMatch(new Date(2026, 0, 30), matcher)).toBe(true); // end boundary
    expect(isDateMatch(new Date(2026, 0, 25), matcher)).toBe(false);
    expect(isDateMatch(new Date(2026, 0, 31), matcher)).toBe(false);
  });

  it('normalizes a reversed DateInterval (to before from)', () => {
    const matcher = { from: new Date(2026, 0, 30), to: new Date(2026, 0, 26) };
    expect(isDateMatch(new Date(2026, 0, 28), matcher)).toBe(true);
  });

  it('delegates to a custom predicate function matcher', () => {
    const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
    expect(isDateMatch(new Date(2026, 1, 14), isWeekend)).toBe(true); // Saturday
    expect(isDateMatch(new Date(2026, 1, 16), isWeekend)).toBe(false); // Monday
  });
});

describe('isDisabledByAny', () => {
  it('delegates directly when given a single (non-array) matcher', () => {
    expect(isDisabledByAny(new Date(2026, 1, 20), new Date(2026, 1, 20))).toBe(true);
    expect(isDisabledByAny(new Date(2026, 1, 21), new Date(2026, 1, 20))).toBe(false);
  });

  it('OR-combines an array of differently-typed matchers (R4 / Decision 5)', () => {
    const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
    const holiday = { from: new Date(2026, 0, 26), to: new Date(2026, 0, 30) };
    const input = [isWeekend, holiday];

    expect(isDisabledByAny(new Date(2026, 1, 14), input)).toBe(true); // hits weekend
    expect(isDisabledByAny(new Date(2026, 0, 28), input)).toBe(true); // hits holiday interval
    expect(isDisabledByAny(new Date(2026, 1, 16), input)).toBe(false); // hits neither
  });

  it('returns false for an empty matcher array', () => {
    expect(isDisabledByAny(new Date(2026, 1, 16), [])).toBe(false);
  });
});
