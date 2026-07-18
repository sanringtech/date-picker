import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GranularityGridDirective } from './granularity-grid.directive';
import { CALENDAR_TODAY } from './calendar.tokens';

const fixedToday = new Date(2026, 5, 15); // June 2026

@Component({
  selector: 'sanring-test-host',
  imports: [GranularityGridDirective],
  template: `<div sanringGranularityGrid tabindex="0"></div>`,
})
class TestHostComponent {
  @ViewChild(GranularityGridDirective, { static: true }) directive!: GranularityGridDirective;
}

function pressKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('GranularityGridDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let gridEl: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: CALENDAR_TODAY, useValue: () => fixedToday }],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    host.directive.engine.setSelectionGranularity('month');
    fixture.detectChanges();
    gridEl = fixture.nativeElement.querySelector('div');
  });

  it('provides an isolated GranularityPickerEngine instance per host element', () => {
    expect(host.directive.engine).toBeTruthy();
    expect(host.directive.engine.focusedDate()).toBeNull();
  });

  it('ArrowRight/ArrowLeft move focus by one cell', () => {
    pressKey(gridEl, 'ArrowRight');
    expect(host.directive.engine.focusedDate()!.getMonth()).toBe(6); // July

    pressKey(gridEl, 'ArrowLeft');
    pressKey(gridEl, 'ArrowLeft');
    expect(host.directive.engine.focusedDate()!.getMonth()).toBe(4); // May
  });

  it('ArrowDown/ArrowUp move focus by setGridColumns() (default 3)', () => {
    pressKey(gridEl, 'ArrowDown');
    expect(host.directive.engine.focusedDate()!.getMonth()).toBe(8); // June(5) + 3
  });

  it('Home/End move focus to the first/last cell of the grid', () => {
    pressKey(gridEl, 'Home');
    expect(host.directive.engine.focusedDate()!.getMonth()).toBe(0);

    pressKey(gridEl, 'End');
    expect(host.directive.engine.focusedDate()!.getMonth()).toBe(11);
  });

  it('arrow-key movement auto-pages to the adjacent year when crossing the grid boundary', () => {
    pressKey(gridEl, 'End'); // December 2026
    pressKey(gridEl, 'ArrowRight');
    const focused = host.directive.engine.focusedDate()!;
    expect(focused.getFullYear()).toBe(2027);
    expect(focused.getMonth()).toBe(0);
  });

  it('PageDown/PageUp change the year and carry focus along', () => {
    pressKey(gridEl, 'PageDown');
    expect(host.directive.engine.granularityGrids()[0].date.getFullYear()).toBe(2027);

    pressKey(gridEl, 'PageUp');
    expect(host.directive.engine.granularityGrids()[0].date.getFullYear()).toBe(2026);
  });

  it('Enter selects the currently focused period', () => {
    pressKey(gridEl, 'ArrowRight');
    pressKey(gridEl, 'Enter');
    expect(host.directive.engine.selectedDate()).not.toBeNull();
  });

  it('Space selects the currently focused period', () => {
    pressKey(gridEl, 'ArrowRight');
    pressKey(gridEl, ' ');
    expect(host.directive.engine.selectedDate()).not.toBeNull();
  });

  it('Enter/Space before any focus movement is a no-op', () => {
    pressKey(gridEl, 'Enter');
    expect(host.directive.engine.selectedDate()).toBeNull();
  });

  it('Escape aborts an in-progress range draft', () => {
    host.directive.engine.setSelectionMode('range');
    fixture.detectChanges();
    pressKey(gridEl, 'ArrowRight');
    pressKey(gridEl, 'Enter'); // opens draft
    expect(host.directive.engine.isDraftActive()).toBe(true);

    pressKey(gridEl, 'Escape');
    expect(host.directive.engine.isDraftActive()).toBe(false);
  });
});
