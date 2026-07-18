import { Component, Input, OnInit, inject } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import { CALENDAR_LOCALE, GranularityPickerEngine } from '@sanring/date-picker';
import type { GranularityCell, PickerGranularity } from '@sanring/date-picker';
import { ButtonDirective } from './components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from './components/ui/card';

/**
 * Self-contained assembly example for GranularityPickerEngine (M7 / ADR-0001):
 * each instance provides its own engine (component-scoped, same convention as
 * CalendarGridDirective), configures granularity + selection mode once on init,
 * and renders month/quarter/year cells from `granularityGrids()`. No keyboard
 * handling — GranularityPickerEngine intentionally has none yet (PRD §12 open
 * question on non-42-cell keyboard semantics is still unresolved).
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
  ],
  providers: [GranularityPickerEngine],
  templateUrl: './granularity-picker-demo.component.html',
})
export class GranularityPickerDemoComponent implements OnInit {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input({ required: true }) granularity!: PickerGranularity;
  @Input({ required: true }) mode!: 'single' | 'range' | 'multi';
  @Input({ required: true }) testId!: string;

  private readonly locale = inject(CALENDAR_LOCALE);
  protected readonly engine = inject(GranularityPickerEngine);

  ngOnInit(): void {
    this.engine.setSelectionGranularity(this.granularity);
    this.engine.setSelectionMode(this.mode);
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
  protected headerLabel(): string {
    const cells = this.engine.granularityGrids();
    if (cells.length === 0) return '';
    if (this.granularity === 'year') {
      return `${cells[0].date.getFullYear()} – ${cells[cells.length - 1].date.getFullYear()}`;
    }
    if (this.granularity === 'quarter') {
      return `FY${cells[0].date.getFullYear()}`;
    }
    return `${cells[0].date.getFullYear()}`;
  }

  protected prev(): void {
    this.engine.prevYear();
  }

  protected next(): void {
    this.engine.nextYear();
  }

  protected cellTestId(date: Date): string {
    return `${this.testId}-${format(date, 'yyyy-MM-dd')}`;
  }

  protected formatDate(date: Date): string {
    switch (this.granularity) {
      case 'month':
        return `${date.getFullYear()} ${this.locale.monthLabels[date.getMonth()]}`;
      case 'quarter': {
        // Look up this date's position in the current fiscal-quarter grid (Q1..Q4
        // in order) rather than deriving it from the month number, since the
        // quarter index depends on quarterStartMonth, not a fixed month/3 split.
        const cells = this.engine.granularityGrids();
        const index = cells.findIndex((c) => c.date.getTime() === date.getTime());
        return `FY${date.getFullYear()} Q${index >= 0 ? index + 1 : '?'}`;
      }
      case 'year':
        return `${date.getFullYear()}`;
    }
  }

  protected removeDate(date: Date): void {
    this.engine.removeDate(date);
  }
}
