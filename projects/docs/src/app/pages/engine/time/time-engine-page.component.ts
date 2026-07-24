import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { format } from 'date-fns/format';
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronUp,
} from '@lucide/angular';
import { CALENDAR_LOCALE, CalendarGridDirective, TimeAdjustmentEngine } from '@sanring/date-picker';
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
  providers: [TimeAdjustmentEngine],
  templateUrl: './time-engine-page.component.html',
})
export class TimeEnginePageComponent {
  private readonly locale = inject(CALENDAR_LOCALE);
  private readonly gridDirective = viewChild.required(CalendarGridDirective);
  protected readonly timeEngine = inject(TimeAdjustmentEngine);

  protected get calEngine() {
    return this.gridDirective().engine;
  }

  // UI draft signals (display only — TimeAdjustmentEngine holds the real draft state)
  protected readonly draftHours = signal(0);
  protected readonly draftMinutes = signal(0);
  protected readonly hourCycle = signal<TimeHourCycle>('h24');
  protected readonly hasDraft = signal(false);

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

  // Standalone time picker state (no engine involved — pure UI demo)
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

  // ── Calendar day selection ──────────────────────────────────────────────
  protected onDayClick(day: CalendarDay): void {
    this.calEngine.selectDate(day.date);
    const selected = this.calEngine.selectedDate();
    if (selected) {
      this.draftHours.set(selected.getHours());
      this.draftMinutes.set(selected.getMinutes());
    }
    // Abort any pending time draft when switching to a new date
    this.timeEngine.abortTimeDraft('single');
    this.hasDraft.set(false);
  }

  // ── Time adjustment — goes through TimeAdjustmentEngine draft lifecycle ──
  protected adjustHours(delta: number): void {
    this.draftHours.set((this.draftHours() + delta + 24) % 24);
    this.pushDraft();
  }

  protected adjustMinutes(delta: number): void {
    const total = this.draftHours() * 60 + this.draftMinutes() + delta;
    const normalized = (total + 24 * 60) % (24 * 60);
    this.draftHours.set(Math.floor(normalized / 60));
    this.draftMinutes.set(normalized % 60);
    this.pushDraft();
  }

  protected toggleMeridiem(): void {
    this.draftHours.set((this.draftHours() + 12) % 24);
    this.pushDraft();
  }

  protected confirmTime(): void {
    const composed = this.timeEngine.confirmTimeDraft('single');
    if (composed) {
      this.calEngine.setSelectedDate(composed);
    }
    this.hasDraft.set(false);
  }

  protected abortTime(): void {
    this.timeEngine.abortTimeDraft('single');
    // Reset display back to the committed Date on CalendarEngine
    const committed = this.calEngine.selectedDate();
    if (committed) {
      this.draftHours.set(committed.getHours());
      this.draftMinutes.set(committed.getMinutes());
    }
    this.hasDraft.set(false);
  }

  // ── Standalone time picker ───────────────────────────────────────────────
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

  // ── Helpers ─────────────────────────────────────────────────────────────
  protected toWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) weeks.push(grid.slice(i, i + 7) as CalendarDay[]);
    return weeks;
  }

  protected currentMonthLabel(grid: readonly CalendarDay[]): string {
    const cell = grid.find((d) => d.isCurrentMonth) ?? grid[0];
    return `${cell.date.getFullYear()} ${this.locale.monthLabels[cell.date.getMonth()]}`;
  }

  protected formatDate(date: Date): string {
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

  private pushDraft(): void {
    const selected = this.calEngine.selectedDate();
    if (selected === null) return;
    this.timeEngine.startOrUpdateTimeDraft('single', selected, {
      hours: this.draftHours(),
      minutes: this.draftMinutes(),
    });
    this.hasDraft.set(true);
  }
}
