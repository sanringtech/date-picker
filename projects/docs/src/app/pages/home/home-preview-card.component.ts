import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE, CALENDAR_TODAY, CalendarGridDirective } from '@sanring/date-picker';
import type { CalendarDay } from '@sanring/date-picker';
import { ButtonDirective } from '../../components/ui/button';
import { I18nService } from '../../i18n/i18n.service';

const IDLE_TIMEOUT_MS = 3 * 60 * 1000;

@Component({
  selector: 'app-home-preview-card',
  imports: [RouterLink, CalendarGridDirective, ButtonDirective],
  templateUrl: './home-preview-card.component.html',
  providers: [{ provide: CALENDAR_TODAY, useValue: () => new Date() }],
})
export class HomePreviewCardComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().home.previewCard);
  protected readonly locale = inject(CALENDAR_LOCALE);
  private readonly todayFn = inject(CALENDAR_TODAY);
  private readonly previewGrid = viewChild(CalendarGridDirective);

  protected readonly weekdayLabels = [
    ...this.locale.weekdayLabels.slice(this.locale.weekStartsOn),
    ...this.locale.weekdayLabels.slice(0, this.locale.weekStartsOn),
  ];

  protected readonly isLive = signal(true);
  protected readonly now = signal(new Date());
  private readonly selectedCalendarDate = signal<Date | null>(null);
  private readonly manualHour = signal<number | null>(null);
  private readonly manualMinute = signal<number | null>(null);
  protected readonly pickerHour = computed(() => this.manualHour() ?? this.now().getHours());
  protected readonly pickerMinute = computed(() => this.manualMinute() ?? this.now().getMinutes());
  private idleTimeoutId?: ReturnType<typeof setTimeout>;

  protected readonly displayDate = computed(() => {
    const date = this.isLive() ? this.now() : (this.selectedCalendarDate() ?? this.now());
    return format(date, 'yyyy-MM-dd');
  });

  protected readonly displayTimeOfDay = computed(() => {
    if (this.isLive()) return format(this.now(), 'HH:mm');
    const h = this.pickerHour().toString().padStart(2, '0');
    const m = this.pickerMinute().toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  constructor() {
    afterNextRender(() => {
      const today = this.todayFn();
      this.previewGrid()?.engine.selectDate(today);
      this.selectedCalendarDate.set(today);
    });

    const intervalId = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(intervalId);
      clearTimeout(this.idleTimeoutId);
    });
  }

  protected currentMonthLabel(days: readonly CalendarDay[]): string {
    const current = days.find((d) => d.isCurrentMonth) ?? days[0];
    return `${current.date.getFullYear()} ${this.locale.monthLabels[current.date.getMonth()]}`;
  }

  protected toWeeks(days: readonly CalendarDay[]): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) weeks.push(days.slice(i, i + 7) as CalendarDay[]);
    return weeks;
  }

  protected selectCalendarDate(date: Date): void {
    this.selectedCalendarDate.set(date);
    this.previewGrid()?.engine.selectDate(date);
  }

  protected adjustPickerHour(delta: number): void {
    this.manualHour.set((this.pickerHour() + delta + 24) % 24);
    this.markInteraction();
  }

  protected adjustPickerMinute(delta: number): void {
    this.manualMinute.set((this.pickerMinute() + delta + 60) % 60);
    this.markInteraction();
  }

  protected markInteraction(): void {
    this.isLive.set(false);
    clearTimeout(this.idleTimeoutId);
    this.idleTimeoutId = setTimeout(() => this.revertToLive(), IDLE_TIMEOUT_MS);
  }

  private revertToLive(): void {
    this.isLive.set(true);
    this.manualHour.set(null);
    this.manualMinute.set(null);
    const today = this.todayFn();
    this.selectedCalendarDate.set(today);
    this.previewGrid()?.engine.selectDate(today);
  }
}
