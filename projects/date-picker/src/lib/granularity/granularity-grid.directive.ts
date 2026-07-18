import { Directive, HostListener, inject } from '@angular/core';
import { GranularityPickerEngine } from './granularity-picker-engine';

/**
 * Mounts a `GranularityPickerEngine` instance onto the host element and
 * translates keydown events into engine calls — the GranularityPickerEngine
 * equivalent of `CalendarGridDirective` (2026-07-18 delta, resolving the M7
 * keyboard-semantics open question; see PRD §7 "粒度選取網格鍵盤互動對應表").
 * Renders nothing — the consumer supplies the markup and reads
 * `engine.granularityGrids()` / `engine.focusedDate()` to paint it however
 * they like. Up/down step size must be kept in sync with the consumer's own
 * layout via `engine.setGridColumns()` — the engine has no DOM/CSS visibility
 * into how many columns the consumer actually rendered (R1).
 */
@Directive({
  selector: '[sanringGranularityGrid]',
  exportAs: 'sanringGranularityGrid',
  providers: [GranularityPickerEngine],
})
export class GranularityGridDirective {
  readonly engine = inject(GranularityPickerEngine);

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
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
        this.selectFocusedCell();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private selectFocusedCell(): void {
    const focused = this.engine.focusedDate();
    if (focused !== null) {
      this.engine.selectDate(focused);
    }
  }
}
