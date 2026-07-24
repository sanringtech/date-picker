import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { format } from 'date-fns/format';
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronUp,
} from '@lucide/angular';
import { CALENDAR_LOCALE, CalendarGridDirective } from '@sanring/date-picker';
import type { CalendarDay } from '@sanring/date-picker';
import { ButtonDirective } from '../../../components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from '../../../components/ui/card';

type TimeHourCycle = 'h12' | 'h24';

@Component({
  selector: 'app-time-engine-page',
  imports: [
    CalendarGridDirective,
    ButtonDirective,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronUp,
    LucideChevronDown,
  ],
  templateUrl: './time-engine-page.component.html',
})
export class TimeEnginePageComponent {
  private readonly locale = inject(CALENDAR_LOCALE);
  private readonly gridDirective = viewChild.required(CalendarGridDirective);

  protected get engine() {
    return this.gridDirective().engine;
  }

  protected readonly draftHours = signal(9);
  protected readonly draftMinutes = signal(0);
  protected readonly hourCycle = signal<TimeHourCycle>('h24');

  protected readonly weekdayLabels = computed(() => [
    ...this.locale.weekdayLabels.slice(this.locale.weekStartsOn),
    ...this.locale.weekdayLabels.slice(0, this.locale.weekStartsOn),
  ]);

  protected readonly displayHour = computed(() =>
    this.hourCycle() === 'h24'
      ? this.pad(this.draftHours())
      : this.formatTwelveHour(this.draftHours()),
  );
  protected readonly meridiem = computed(() => (this.draftHours() < 12 ? 'AM' : 'PM'));

  protected readonly format = format;

  // Standalone time picker state
  protected readonly standaloneDraftHours = signal(9);
  protected readonly standaloneDraftMinutes = signal(30);
  protected readonly standaloneHourCycle = signal<TimeHourCycle>('h24');
  protected readonly minuteStep = 5;

  protected readonly standaloneDisplayHour = computed(() =>
    this.standaloneHourCycle() === 'h24'
      ? this.pad(this.standaloneDraftHours())
      : this.formatTwelveHour(this.standaloneDraftHours()),
  );
  protected readonly standaloneMeridiem = computed(() =>
    this.standaloneDraftHours() < 12 ? 'AM' : 'PM',
  );
  protected readonly standaloneSelectedTimeLabel = computed(() => {
    const d = new Date(2026, 6, 13);
    d.setHours(this.standaloneDraftHours(), this.standaloneDraftMinutes(), 0, 0);
    const pattern = this.standaloneHourCycle() === 'h24' ? 'HH:mm' : 'hh:mm a';
    return format(d, pattern);
  });

  protected onDayClick(day: CalendarDay): void {
    this.engine.selectDate(day.date);
    const selected = this.engine.selectedDate();
    if (selected) {
      this.draftHours.set(selected.getHours());
      this.draftMinutes.set(selected.getMinutes());
    }
  }

  protected adjustHours(delta: number): void {
    this.draftHours.set((this.draftHours() + delta + 24) % 24);
    this.applySelectedTime();
  }

  protected adjustMinutes(delta: number): void {
    const total = this.draftHours() * 60 + this.draftMinutes() + delta;
    const normalized = (total + 24 * 60) % (24 * 60);
    this.draftHours.set(Math.floor(normalized / 60));
    this.draftMinutes.set(normalized % 60);
    this.applySelectedTime();
  }

  protected toggleMeridiem(): void {
    this.draftHours.set((this.draftHours() + 12) % 24);
    this.applySelectedTime();
  }

  protected standaloneAdjustHours(delta: number): void {
    this.standaloneDraftHours.set((this.standaloneDraftHours() + delta + 24) % 24);
  }

  protected standaloneAdjustMinutes(delta: number): void {
    const total = this.standaloneDraftHours() * 60 + this.standaloneDraftMinutes() + delta;
    const normalized = (total + 24 * 60) % (24 * 60);
    this.standaloneDraftHours.set(Math.floor(normalized / 60));
    this.standaloneDraftMinutes.set(normalized % 60);
  }

  protected standaloneToggleMeridiem(): void {
    this.standaloneDraftHours.set((this.standaloneDraftHours() + 12) % 24);
  }

  protected standaloneResetTime(): void {
    this.standaloneDraftHours.set(9);
    this.standaloneDraftMinutes.set(30);
  }

  protected toWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) weeks.push(grid.slice(i, i + 7) as CalendarDay[]);
    return weeks;
  }

  protected currentMonthLabel(grid: readonly CalendarDay[]): string {
    const cell = grid.find((d) => d.isCurrentMonth) ?? grid[0];
    return `${cell.date.getFullYear()} ${this.locale.monthLabels[cell.date.getMonth()]}`;
  }

  protected formatSelectedDate(date: Date): string {
    const pattern = this.hourCycle() === 'h24' ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd hh:mm:ss a';
    return format(date, pattern);
  }

  protected pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private formatTwelveHour(hours: number): string {
    const normalized = hours % 12;
    return this.pad(normalized === 0 ? 12 : normalized);
  }

  private applySelectedTime(): void {
    const selected = this.engine.selectedDate();
    if (selected === null) return;
    const next = new Date(selected);
    next.setHours(this.draftHours(), this.draftMinutes(), 0, 0);
    this.engine.setSelectedDate(next);
  }
}
