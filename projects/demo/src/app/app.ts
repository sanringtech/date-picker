import { Component, inject } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { CALENDAR_LOCALE, CalendarGridDirective } from '@sanring/date-picker';
import type { CalendarDay } from '@sanring/date-picker';
import { ButtonDirective } from './components/ui/button';

@Component({
  selector: 'app-root',
  imports: [CalendarGridDirective, ButtonDirective, LucideChevronLeft, LucideChevronRight],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly locale = inject(CALENDAR_LOCALE);

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
