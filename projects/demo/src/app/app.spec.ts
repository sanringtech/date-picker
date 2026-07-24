import { TestBed } from '@angular/core/testing';
import { CALENDAR_LOCALE, CALENDAR_QUARTER_STARTS_ON } from '@sanring/date-picker';
import type { CalendarLocale } from '@sanring/date-picker';
import { App } from './app';

const testLocale: CalendarLocale = {
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

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: CALENDAR_LOCALE, useValue: testLocale },
        { provide: CALENDAR_QUARTER_STARTS_ON, useValue: 3 },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders one independent 42-cell grid per demo scenario', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const grids = compiled.querySelectorAll('[data-testid^="calendar-grid-"]');
    expect(grids).toHaveLength(6);

    for (const scenarioId of ['basic', 'no-deselect', 'disabled']) {
      const cells = compiled.querySelectorAll(
        `[data-testid="calendar-grid-${scenarioId}"] [data-testid^="calendar-day-${scenarioId}-"]`,
      );
      expect(cells).toHaveLength(42);
    }
  });

  it('groups the showcase by usage frequency and keeps selection info as a separate block', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="toggle-info-block"]')).toBeNull();

    const groups = Array.from(
      compiled.querySelectorAll<HTMLElement>('[data-testid^="demo-group-"]'),
    )
      .map((group) => group.dataset['testid'])
      .filter((id): id is string => id !== undefined);
    expect(groups).toEqual([
      'demo-group-common-date',
      'demo-group-time',
      'demo-group-period',
      'demo-group-advanced-date',
      'demo-group-assembly',
    ]);

    expect(
      compiled.querySelector(
        '[data-testid="calendar-grid-basic"] [data-testid="calendar-selected-value-basic"]',
      ),
    ).toBeNull();
    expect(compiled.querySelector('[data-testid="calendar-selected-value-basic"]')).toBeTruthy();
  });

  it('only the "disabled" scenario has disabled cells; "basic"/"no-deselect" have none (independent engine instances)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const disabledInDisabledScenario = compiled.querySelectorAll(
      '[data-testid="calendar-grid-disabled"] [data-testid^="calendar-day-"][disabled]',
    );
    expect(disabledInDisabledScenario.length).toBeGreaterThan(0);

    for (const scenarioId of ['basic', 'no-deselect']) {
      const disabledCells = compiled.querySelectorAll(
        `[data-testid="calendar-grid-${scenarioId}"] [data-testid^="calendar-day-"][disabled]`,
      );
      expect(disabledCells).toHaveLength(0);
    }
  });

  it('Multi scenario: clicking two days shows removable chips, and the remove button removes just one (M6)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const multiDays = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>(
        '[data-testid="calendar-grid-multi"] [data-testid^="calendar-day-multi-"]:not([disabled])',
      ),
    );
    multiDays[5].click();
    multiDays[10].click();
    fixture.detectChanges();

    let chips = compiled.querySelectorAll(
      '[data-testid="calendar-chips-multi"] [data-testid^="calendar-remove-multi-"]',
    );
    expect(chips).toHaveLength(2);
    expect(
      compiled.querySelector('[data-testid="calendar-selected-value-multi"]')?.textContent,
    ).toContain('已選 2 天');

    (chips[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    chips = compiled.querySelectorAll(
      '[data-testid="calendar-chips-multi"] [data-testid^="calendar-remove-multi-"]',
    );
    expect(chips).toHaveLength(1);
  });

  it('renders one card per Granularity Selection scenario (M7)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    for (const id of ['month-picker', 'quarter-picker', 'year-picker']) {
      expect(compiled.querySelector(`[data-testid="granularity-grid-${id}"]`)).toBeTruthy();
    }
    // Month granularity: 12 cells.
    expect(
      compiled.querySelectorAll(
        '[data-testid="granularity-grid-month-picker"] [data-testid^="granularity-cell-"]',
      ),
    ).toHaveLength(12);
    // Quarter granularity: 4 cells.
    expect(
      compiled.querySelectorAll(
        '[data-testid="granularity-grid-quarter-picker"] [data-testid^="granularity-cell-"]',
      ),
    ).toHaveLength(4);
  });

  it('Quarter-picker scenario: two clicks commit a range using the injected fiscal year (M7)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const quarterCells = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>(
        '[data-testid="granularity-grid-quarter-picker"] [data-testid^="granularity-cell-"]',
      ),
    );
    quarterCells[0].click();
    fixture.detectChanges();
    expect(
      compiled.querySelector('[data-testid="granularity-selected-value-quarter-picker"]')
        ?.textContent,
    ).toContain('起點');

    quarterCells[2].click();
    fixture.detectChanges();
    expect(
      compiled.querySelector('[data-testid="granularity-selected-value-quarter-picker"]')
        ?.textContent,
    ).toContain('～');
  });

  it('Year-picker scenario: multi mode accumulates cells and exposes per-item removal chips (M7)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const yearCells = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>(
        '[data-testid="granularity-grid-year-picker"] [data-testid^="granularity-cell-"]',
      ),
    );
    yearCells[1].click();
    yearCells[4].click();
    fixture.detectChanges();

    const chips = compiled.querySelectorAll(
      '[data-testid="granularity-chips-year-picker"] [data-testid^="granularity-remove-year-picker-"]',
    );
    expect(chips).toHaveLength(2);
  });

  it('Multi-month scenario (⑪): repeated ArrowRight moves the rendered focus ring exactly 1 day forward each press (2026-07-18 regression)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const gridEl = compiled.querySelector<HTMLElement>('[data-testid="calendar-grid-multimonth"]');
    expect(gridEl).toBeTruthy();

    const pressKey = (key: string) =>
      gridEl!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

    const focusedDates: Date[] = [];
    for (let i = 0; i < 100; i++) {
      pressKey('ArrowRight');
      fixture.detectChanges();
      const focusedCell = gridEl!.querySelector<HTMLElement>(
        '[data-testid^="calendar-day-multimonth-"].ring-primary',
      );
      expect(focusedCell).toBeTruthy();
      const dateStr = focusedCell!.dataset['testid']!.replace('calendar-day-multimonth-', '');
      focusedDates.push(new Date(dateStr + 'T00:00:00'));
    }

    for (let i = 1; i < focusedDates.length; i++) {
      const diffDays = (focusedDates[i].getTime() - focusedDates[i - 1].getTime()) / 86_400_000;
      expect(diffDays).toBe(1);
    }
  });

  it('Month-picker scenario: keyboard arrows/Enter select a month via GranularityGridDirective (M7)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const gridEl = compiled.querySelector<HTMLElement>(
      '[data-testid="granularity-grid-month-picker"]',
    );
    expect(gridEl).toBeTruthy();

    const pressKey = (key: string) =>
      gridEl!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

    pressKey('ArrowRight');
    pressKey('ArrowRight');
    pressKey('Enter');
    fixture.detectChanges();

    expect(
      compiled.querySelector('[data-testid="granularity-selected-value-month-picker"]')
        ?.textContent,
    ).toContain('已選');
  });

  it('Time Adjustment demo: can switch between 24-hour and 12-hour display without changing Date composition', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector<HTMLElement>(
      '[data-testid="scenario-section-time-adjustment"]',
    );
    expect(section).toBeTruthy();
    expect(section!.getAttribute('aria-labelledby')).toBe('scenario-title-time-adjustment');

    const firstDay = section!.querySelector<HTMLButtonElement>('[data-testid^="time-demo-day-"]');
    expect(firstDay).toBeTruthy();

    firstDay!.click();
    fixture.detectChanges();
    expect(section!.querySelector('[data-testid="time-demo-hours"]')?.textContent).toContain('00');
    expect(section!.querySelector('[data-testid="time-demo-result"]')?.textContent).toContain(
      '00:00:00',
    );

    section!.querySelector<HTMLButtonElement>('[data-testid="time-demo-hour-cycle-12"]')!.click();
    fixture.detectChanges();
    expect(section!.querySelector('[data-testid="time-demo-hours"]')?.textContent).toContain('12');
    expect(section!.querySelector('[data-testid="time-demo-meridiem"]')?.textContent).toContain(
      'AM',
    );
    expect(section!.querySelector('[data-testid="time-demo-result"]')?.textContent).toContain(
      '12:00:00 AM',
    );

    section!.querySelector<HTMLButtonElement>('[data-testid="time-demo-meridiem"]')!.click();
    fixture.detectChanges();
    expect(section!.querySelector('[data-testid="time-demo-meridiem"]')?.textContent).toContain(
      'PM',
    );
    expect(section!.querySelector('[data-testid="time-demo-result"]')?.textContent).toContain(
      '12:00:00 PM',
    );

    section!.querySelector<HTMLButtonElement>('[data-testid="time-demo-hour-cycle-24"]')!.click();
    fixture.detectChanges();
    expect(section!.querySelector('[data-testid="time-demo-result"]')?.textContent).toContain(
      '12:00:00',
    );
    expect(section!.querySelector('[data-testid="time-demo-confirm"]')).toBeNull();
    expect(section!.querySelector('[data-testid="time-demo-abort"]')).toBeNull();
  });

  it('Time Picker demo: renders as an independent time-only section', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector<HTMLElement>(
      '[data-testid="scenario-section-time-picker"]',
    );
    expect(section).toBeTruthy();
    expect(section!.getAttribute('aria-labelledby')).toBe('scenario-title-time-picker');
    expect(section!.querySelector('#scenario-title-time-picker')?.textContent).toContain(
      '獨立時分選擇器',
    );

    expect(section!.querySelector('[data-testid="time-picker-hours"]')?.textContent).toContain(
      '09',
    );
    expect(section!.querySelector('[data-testid="time-picker-minutes"]')?.textContent).toContain(
      '30',
    );
    expect(section!.querySelector('[data-testid="time-picker-result"]')?.textContent).toContain(
      '09:30',
    );

    section!.querySelector<HTMLButtonElement>('[data-testid="time-picker-minute-up"]')!.click();
    fixture.detectChanges();
    expect(section!.querySelector('[data-testid="time-picker-minutes"]')?.textContent).toContain(
      '35',
    );
    expect(section!.querySelector('[data-testid="time-picker-result"]')?.textContent).toContain(
      '09:35',
    );

    section!.querySelector<HTMLButtonElement>('[data-testid="time-picker-hour-cycle-12"]')!.click();
    fixture.detectChanges();
    expect(section!.querySelector('[data-testid="time-picker-result"]')?.textContent).toContain(
      '09:35 AM',
    );

    section!.querySelector<HTMLButtonElement>('[data-testid="time-picker-meridiem"]')!.click();
    fixture.detectChanges();
    expect(section!.querySelector('[data-testid="time-picker-result"]')?.textContent).toContain(
      '09:35 PM',
    );

    section!.querySelector<HTMLButtonElement>('[data-testid="time-picker-hour-cycle-24"]')!.click();
    fixture.detectChanges();
    expect(section!.querySelector('[data-testid="time-picker-result"]')?.textContent).toContain(
      '21:35',
    );

    expect(section!.querySelector('[data-testid="time-picker-confirm"]')).toBeNull();
  });

  it('drill-down scenario: zooming out to year, then back in through month, selects a day decades away (1996-08-17)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const section = compiled.querySelector(
      '[data-testid="scenario-section-drilldown"]',
    ) as HTMLElement;
    const header = () =>
      section.querySelector('[data-testid="drilldown-header"]') as HTMLButtonElement;
    const prevButton = () =>
      section.querySelector('[data-testid="drilldown-prev"]') as HTMLButtonElement;

    // day -> month (zoom out)
    header().click();
    fixture.detectChanges();
    expect(section.querySelector('[data-testid="drilldown-month-grid"]')).toBeTruthy();

    // month -> year (zoom out again)
    header().click();
    fixture.detectChanges();
    expect(section.querySelector('[data-testid="drilldown-year-grid"]')).toBeTruthy();

    // Page back with prevYear() until the 1996 cell is in the visible window.
    let yearCell = section.querySelector<HTMLButtonElement>(
      '[data-testid="drilldown-year-1996-01-01"]',
    );
    for (let guard = 0; !yearCell && guard < 50; guard++) {
      prevButton().click();
      fixture.detectChanges();
      yearCell = section.querySelector<HTMLButtonElement>(
        '[data-testid="drilldown-year-1996-01-01"]',
      );
    }
    expect(yearCell).toBeTruthy();

    // year -> month (zoom in, GranularityPickerEngine.setViewDate hands off the picked year)
    yearCell!.click();
    fixture.detectChanges();
    const augustCell = section.querySelector<HTMLButtonElement>(
      '[data-testid="drilldown-month-1996-08-01"]',
    );
    expect(augustCell).toBeTruthy();

    // month -> day (zoom in again, CalendarEngine.setViewDate hands off the picked month)
    augustCell!.click();
    fixture.detectChanges();
    const day17 = section.querySelector<HTMLButtonElement>(
      '[data-testid="drilldown-day-1996-08-17"]',
    );
    expect(day17).toBeTruthy();

    day17!.click();
    fixture.detectChanges();

    expect(
      section.querySelector('[data-testid="drilldown-selected-value"]')?.textContent,
    ).toContain('1996-08-17');
  });
});
