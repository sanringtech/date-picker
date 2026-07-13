import { Component, effect, inject, viewChild } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { CALENDAR_LOCALE, CalendarGridDirective } from '@sanring/date-picker';
import type { CalendarDay, DateInterval } from '@sanring/date-picker';
import { ButtonDirective } from './components/ui/button';
import { FIXED_TODAY } from './app.config';

/** R4 / Decision 5: an OR-combined disabled matcher — weekends (predicate) + a fixed holiday block (DateInterval). */
const isWeekend = (date: Date): boolean => date.getDay() === 0 || date.getDay() === 6;
const summerBreak: DateInterval = { from: new Date(2026, 6, 20), to: new Date(2026, 6, 24) };

@Component({
  selector: 'app-root',
  imports: [CalendarGridDirective, ButtonDirective, LucideChevronLeft, LucideChevronRight],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly locale = inject(CALENDAR_LOCALE);
  private readonly grid = viewChild.required(CalendarGridDirective);

  protected readonly fixedToday = FIXED_TODAY;
  protected readonly summerBreak = summerBreak;

  constructor() {
    effect(() => {
      this.grid().engine.setDisabled([isWeekend, summerBreak]);
    });
  }

  protected readonly weekdayLabels = [
    ...this.locale.weekdayLabels.slice(this.locale.weekStartsOn),
    ...this.locale.weekdayLabels.slice(0, this.locale.weekStartsOn),
  ];

  protected currentMonthLabel(days: readonly CalendarDay[]): string {
    const current = days.find((day) => day.isCurrentMonth) ?? days[0];
    return `${current.date.getFullYear()} ${this.locale.monthLabels[current.date.getMonth()]}`;
  }

  protected dayTestId(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  protected formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  protected toggleTheme(): void {
    const root = document.documentElement;
    if (root.dataset['theme'] === 'light') {
      delete root.dataset['theme'];
    } else {
      root.dataset['theme'] = 'light';
    }
  }
}
