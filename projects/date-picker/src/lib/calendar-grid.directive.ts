import { Directive, HostListener, inject } from '@angular/core';
import { CalendarEngine } from './calendar-engine';

/**
 * Mounts a `CalendarEngine` instance onto the host element and translates
 * keydown events into engine calls. Renders nothing — no DOM structure, no
 * CSS (constitution R1) — the consumer supplies the markup and reads
 * `engine.monthGrids()` / `engine.selectedDate()` / `engine.focusedDate()` to
 * paint it however they like (e.g. via Tailwind).
 *
 * M4 adds: Decision 6 cross-month auto-transfer (arrow keys crossing the
 * visible window boundary trigger prevMonth()/nextMonth() and land on the
 * corresponding logical cell).  Home/End stay within the same week row and
 * never cross a month.  PageUp/PageDown change month explicitly.
 * M3: Escape aborts a range draft (Decision 3); in single mode Escape is
 * not consumed so the outer shell can use it (e.g. close a popover).
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
    // Escape is handled conditionally — only consumed in range-draft mode.
    if (event.key === 'Escape') {
      if (this.engine.isDraftActive()) {
        this.engine.abortRangeDraft();
        event.preventDefault();
      }
      return;
    }

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
