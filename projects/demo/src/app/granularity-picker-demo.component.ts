import { Component, Input, effect, inject, viewChild } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import { CALENDAR_LOCALE, GranularityGridDirective } from '@sanring/date-picker';
import type { GranularityCell, GranularityPickerEngine, PickerGranularity } from '@sanring/date-picker';
import { ButtonDirective } from './components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from './components/ui/card';

/**
 * Self-contained assembly example for GranularityPickerEngine (M7 / ADR-0001):
 * hosts `GranularityGridDirective` on its own grid element (component-scoped,
 * same convention as CalendarGridDirective in app.html) for real keyboard
 * navigation — arrows/Home/End/PageUp/PageDown/Enter/Space (2026-07-18 delta,
 * resolving the M7 keyboard-semantics open question). `setGridColumns()` is
 * kept in sync with the CSS grid-cols actually rendered below, since the
 * engine has no visibility into the consumer's layout (R1).
 */
@Component({
  selector: 'app-granularity-picker-demo',
  standalone: true,
  imports: [
    ButtonDirective,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX,
    GranularityGridDirective,
  ],
  templateUrl: './granularity-picker-demo.component.html',
})
export class GranularityPickerDemoComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input({ required: true }) granularity!: PickerGranularity;
  @Input({ required: true }) mode!: 'single' | 'range' | 'multi';
  @Input({ required: true }) testId!: string;

  private readonly locale = inject(CALENDAR_LOCALE);
  protected readonly gridDirective = viewChild.required(GranularityGridDirective);

  constructor() {
    effect(() => {
      const engine = this.gridDirective().engine;
      engine.setSelectionGranularity(this.granularity);
      engine.setSelectionMode(this.mode);
      // Must match the `gridCols` CSS below — the engine has no way to infer it itself.
      engine.setGridColumns(this.granularity === 'quarter' ? 2 : 3);
    });
  }

  /** Grid column count per granularity — 12/4/N cells laid out as a compact grid. */
  protected get gridCols(): string {
    return this.granularity === 'quarter' ? 'grid-cols-2' : 'grid-cols-3';
  }

  protected cellLabel(cell: GranularityCell, index: number): string {
    switch (this.granularity) {
      case 'month':
        return this.locale.monthLabels[cell.date.getMonth()];
      case 'quarter':
        // granularityGrids() always returns the 4 fiscal quarters in order (Q1..Q4).
        return `Q${index + 1}`;
      case 'year':
        return `${cell.date.getFullYear()}`;
    }
  }

  /** Header above the grid: the year (month/year granularity) or fiscal year (quarter). */
  protected headerLabel(engine: GranularityPickerEngine): string {
    const cells = engine.granularityGrids();
    if (cells.length === 0) return '';
    if (this.granularity === 'year') {
      return `${cells[0].date.getFullYear()} – ${cells[cells.length - 1].date.getFullYear()}`;
    }
    if (this.granularity === 'quarter') {
      return `FY${cells[0].date.getFullYear()}`;
    }
    return `${cells[0].date.getFullYear()}`;
  }

  protected cellTestId(date: Date): string {
    return `${this.testId}-${format(date, 'yyyy-MM-dd')}`;
  }

  protected formatDate(engine: GranularityPickerEngine, date: Date): string {
    switch (this.granularity) {
      case 'month':
        return `${date.getFullYear()} ${this.locale.monthLabels[date.getMonth()]}`;
      case 'quarter': {
        // Look up this date's position in the current fiscal-quarter grid (Q1..Q4
        // in order) rather than deriving it from the month number, since the
        // quarter index depends on quarterStartMonth, not a fixed month/3 split.
        const cells = engine.granularityGrids();
        const index = cells.findIndex((c) => c.date.getTime() === date.getTime());
        return `FY${date.getFullYear()} Q${index >= 0 ? index + 1 : '?'}`;
      }
      case 'year':
        return `${date.getFullYear()}`;
    }
  }
}
