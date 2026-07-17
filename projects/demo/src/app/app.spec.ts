import { TestBed } from '@angular/core/testing';
import { CALENDAR_LOCALE } from '@sanring/date-picker';
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
      providers: [{ provide: CALENDAR_LOCALE, useValue: testLocale }],
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
});
