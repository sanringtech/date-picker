import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { isSameDay } from 'date-fns/isSameDay';
import { CalendarGridDirective } from './calendar-grid.directive';
import { CALENDAR_LOCALE, CALENDAR_TODAY } from './calendar.tokens';
import type { CalendarLocale } from './calendar.types';

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

const fixedToday = new Date(2026, 1, 15); // Sunday, Feb 15 2026

@Component({
  selector: 'sanring-test-host',
  imports: [CalendarGridDirective],
  template: `<div sanringCalendarGrid tabindex="0"></div>`,
})
class TestHostComponent {
  @ViewChild(CalendarGridDirective, { static: true }) directive!: CalendarGridDirective;
}

function pressKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('CalendarGridDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let gridEl: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CALENDAR_LOCALE, useValue: testLocale },
        { provide: CALENDAR_TODAY, useValue: () => fixedToday },
      ],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    gridEl = fixture.nativeElement.querySelector('div');
  });

  it('provides an isolated CalendarEngine instance per host element', () => {
    expect(host.directive.engine).toBeTruthy();
    expect(host.directive.engine.focusedDate()).toBeNull();
  });

  it('ArrowRight/ArrowLeft move focus by one day', () => {
    pressKey(gridEl, 'ArrowRight');
    let focused = host.directive.engine.focusedDate();
    expect(focused).not.toBeNull();
    expect(isSameDay(focused!, new Date(2026, 1, 16))).toBe(true);

    pressKey(gridEl, 'ArrowLeft');
    pressKey(gridEl, 'ArrowLeft');
    focused = host.directive.engine.focusedDate();
    expect(isSameDay(focused!, new Date(2026, 1, 14))).toBe(true);
  });

  it('ArrowDown/ArrowUp move focus by one week', () => {
    pressKey(gridEl, 'ArrowDown');
    const focused = host.directive.engine.focusedDate();
    expect(isSameDay(focused!, new Date(2026, 1, 22))).toBe(true);
  });

  it('Home/End move focus to the start/end of the current week row', () => {
    pressKey(gridEl, 'Home');
    let focused = host.directive.engine.focusedDate();
    expect(isSameDay(focused!, new Date(2026, 1, 9))).toBe(true); // Monday of that week

    pressKey(gridEl, 'End');
    focused = host.directive.engine.focusedDate();
    expect(isSameDay(focused!, new Date(2026, 1, 15))).toBe(true); // Sunday of that week
  });

  it('arrow-key movement auto-transfers to the adjacent month when crossing the grid boundary (Decision 6)', () => {
    // today = Feb 15 2026 (Sunday, weekStartsOn=1). Feb grid (starts Mon Jan 26)
    // places Feb 15 at flat index 20. 21 left-presses exhaust indices 20→0 then
    // cross to -1, triggering prevMonth() so the window slides to January.
    for (let i = 0; i < 21; i++) {
      pressKey(gridEl, 'ArrowLeft');
    }
    const currentMonthCells = host.directive.engine
      .monthGrids()[0]
      .filter((cell) => cell.isCurrentMonth);
    // view has slid to January 2026 — auto-transfer happened (not clamped)
    expect(currentMonthCells[0].date.getMonth()).toBe(0);
    expect(host.directive.engine.focusedDate()).not.toBeNull();
  });

  it('PageDown/PageUp change the rendered month and carry focus along', () => {
    pressKey(gridEl, 'PageDown');
    let currentMonthCells = host.directive.engine
      .monthGrids()[0]
      .filter((cell) => cell.isCurrentMonth);
    expect(currentMonthCells[0].date.getMonth()).toBe(2); // March

    pressKey(gridEl, 'PageUp');
    currentMonthCells = host.directive.engine.monthGrids()[0].filter((cell) => cell.isCurrentMonth);
    expect(currentMonthCells[0].date.getMonth()).toBe(1); // back to February
  });

  it('Enter selects the currently focused date', () => {
    pressKey(gridEl, 'ArrowRight');
    pressKey(gridEl, 'Enter');

    const selected = host.directive.engine.selectedDate();
    expect(selected).not.toBeNull();
    expect(isSameDay(selected!, new Date(2026, 1, 16))).toBe(true);
  });

  it('Space selects the currently focused date', () => {
    pressKey(gridEl, 'ArrowRight');
    pressKey(gridEl, ' ');

    const selected = host.directive.engine.selectedDate();
    expect(selected).not.toBeNull();
    expect(isSameDay(selected!, new Date(2026, 1, 16))).toBe(true);
  });

  it('Enter/Space before any focus movement is a no-op (no cell focused yet)', () => {
    pressKey(gridEl, 'Enter');
    expect(host.directive.engine.selectedDate()).toBeNull();
  });
});
