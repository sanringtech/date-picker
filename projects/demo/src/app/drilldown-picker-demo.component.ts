import { Component, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { CALENDAR_LOCALE, CalendarEngine, GranularityPickerEngine } from '@sanring/date-picker';
import type { CalendarDay, GranularityCell } from '@sanring/date-picker';
import { ButtonDirective } from './components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from './components/ui/card';

type ViewMode = 'day' | 'month' | 'year';

/**
 * Proof-of-composition demo: CalendarEngine and GranularityPickerEngine are
 * sibling engines (ADR-0001) with no built-in link between them — this
 * component is the "consumer glue" that wires them into the classic
 * year → month → day drill-down UX. Neither engine knows the other exists;
 * `viewMode` is plain component state, and the only cross-engine call is
 * `setViewDate()` handing off the picked year/month as the next engine's anchor.
 */
@Component({
  selector: 'app-drilldown-picker-demo',
  standalone: true,
  imports: [
    ButtonDirective,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  providers: [CalendarEngine, GranularityPickerEngine],
  templateUrl: './drilldown-picker-demo.component.html',
})
export class DrillDownPickerDemoComponent {
  private readonly locale = inject(CALENDAR_LOCALE);
  protected readonly dayEngine = inject(CalendarEngine);
  protected readonly granularityEngine = inject(GranularityPickerEngine);

  /** Consumer-owned UI state — neither engine has any notion of "which panel is showing". */
  protected readonly viewMode = signal<ViewMode>('day');

  protected readonly weekdayLabels = [
    ...this.locale.weekdayLabels.slice(this.locale.weekStartsOn),
    ...this.locale.weekdayLabels.slice(0, this.locale.weekStartsOn),
  ];

  /** Zoom out one level: day header click -> month picker; month header click -> year picker. */
  protected zoomOut(): void {
    if (this.viewMode() === 'day') {
      const anchor = this.currentDayViewDate();
      this.granularityEngine.setSelectionGranularity('month');
      this.granularityEngine.setViewDate(anchor);
      this.viewMode.set('month');
    } else if (this.viewMode() === 'month') {
      const anchor = this.granularityEngine.granularityGrids()[0]?.date ?? new Date();
      this.granularityEngine.setSelectionGranularity('year');
      // Center the 12-year window roughly on the current anchor year rather than
      // starting the sliding window exactly at it (Decision 8 precedent: the window
      // always starts at viewDate, so shifting back a few years centers the view).
      this.granularityEngine.setViewDate(new Date(anchor.getFullYear() - 5, 0, 1));
      this.viewMode.set('year');
    }
  }

  protected onYearCellClick(cell: GranularityCell): void {
    this.granularityEngine.setSelectionGranularity('month');
    this.granularityEngine.setViewDate(cell.date);
    this.viewMode.set('month');
  }

  protected onMonthCellClick(cell: GranularityCell): void {
    this.dayEngine.setViewDate(cell.date); // hand off the picked month to the day engine
    this.viewMode.set('day');
  }

  protected onDayCellClick(day: CalendarDay): void {
    this.dayEngine.selectDate(day.date);
  }

  protected prev(): void {
    switch (this.viewMode()) {
      case 'day':
        this.dayEngine.prevMonth();
        break;
      case 'month':
      case 'year':
        this.granularityEngine.prevYear();
        break;
    }
  }

  protected next(): void {
    switch (this.viewMode()) {
      case 'day':
        this.dayEngine.nextMonth();
        break;
      case 'month':
      case 'year':
        this.granularityEngine.nextYear();
        break;
    }
  }

  protected headerLabel(): string {
    switch (this.viewMode()) {
      case 'day': {
        const anchor = this.currentDayViewDate();
        return `${anchor.getFullYear()} ${this.locale.monthLabels[anchor.getMonth()]}`;
      }
      case 'month': {
        const cells = this.granularityEngine.granularityGrids();
        return `${cells[0]?.date.getFullYear() ?? ''}`;
      }
      case 'year': {
        const cells = this.granularityEngine.granularityGrids();
        if (cells.length === 0) return '';
        return `${cells[0].date.getFullYear()} – ${cells[cells.length - 1].date.getFullYear()}`;
      }
    }
  }

  protected monthCellLabel(cell: GranularityCell): string {
    return this.locale.monthLabels[cell.date.getMonth()];
  }

  protected yearCellLabel(cell: GranularityCell): string {
    return `${cell.date.getFullYear()}`;
  }

  protected toWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) {
      weeks.push(grid.slice(i, i + 7) as CalendarDay[]);
    }
    return weeks;
  }

  protected formatSelected(): string {
    const selected = this.dayEngine.selectedDate();
    return selected ? format(selected, 'yyyy-MM-dd') : '尚未選取';
  }

  protected dayTestId(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  private currentDayViewDate(): Date {
    const current = this.dayEngine.monthGrids()[0].find((d) => d.isCurrentMonth);
    return current?.date ?? new Date();
  }
}
