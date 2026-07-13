import { Directive, HostListener, inject } from '@angular/core';
import { CalendarEngine } from './calendar-engine';

/**
 * Mounts a `CalendarEngine` instance onto the host element and translates
 * keydown events into engine calls. Renders nothing — no DOM structure, no
 * CSS (constitution R1) — the consumer supplies the markup and reads
 * `engine.monthGrids()` / `engine.selectedDate()` / `engine.focusedDate()` to
 * paint it however they like (e.g. via Tailwind).
 *
 * M1 scope: arrow keys move focus within the current 42-cell grid and clamp
 * at its edges — they do NOT auto-page to the adjacent month. PageUp/PageDown
 * do change month (an explicit user action, distinct from Decision 6's
 * boundary auto-transfer, which lands in M4).
 */
@Directive({
  selector: '[sanringCalendarGrid]',
  exportAs: 'sanringCalendarGrid',
  providers: [CalendarEngine],
})
export class CalendarGridDirective {
  readonly engine = inject(CalendarEngine);

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        this.engine.moveFocus('left');
        break;
      case 'ArrowRight':
        this.engine.moveFocus('right');
        break;
      case 'ArrowUp':
        this.engine.moveFocus('up');
        break;
      case 'ArrowDown':
        this.engine.moveFocus('down');
        break;
      case 'Home':
        this.engine.moveFocus('home');
        break;
      case 'End':
        this.engine.moveFocus('end');
        break;
      case 'PageUp':
        this.engine.moveFocus('pageup');
        break;
      case 'PageDown':
        this.engine.moveFocus('pagedown');
        break;
      case 'Enter':
      case ' ':
        this.selectFocusedDate();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private selectFocusedDate(): void {
    const focused = this.engine.focusedDate();
    if (focused !== null) {
      this.engine.selectDate(focused);
    }
  }
}
