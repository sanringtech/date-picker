import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { CALENDAR_LOCALE, CalendarGridDirective } from '@sanring/date-picker';
import type { CalendarDay } from '@sanring/date-picker';
import { ButtonDirective } from './components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from './components/ui/card';

type TimeHourCycle = 'h12' | 'h24';

@Component({
  selector: 'app-time-adjustment-demo',
  imports: [
    CalendarGridDirective,
    ButtonDirective,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  template: `
    <sanring-card class="w-full overflow-hidden">
      <sanring-card-content class="p-5 md:p-6">
        <div class="flex flex-col items-start gap-6 md:flex-row">
          <!-- 左欄：日曆 -->
          <div class="w-full max-w-[20rem] shrink-0 sm:w-80">
            <div
              class="rounded-lg border border-border bg-background p-4 shadow-inner transition-shadow focus-within:ring-2 focus-within:ring-primary"
            >
              <div
                sanringCalendarGrid
                tabindex="0"
                data-testid="time-demo-calendar-grid"
                class="block outline-none"
              >
                <!-- 月份導覽 -->
                <div class="mb-4 flex items-center justify-between">
                  <button
                    sanringBtn
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label="上一月"
                    (click)="engine.prevMonth()"
                  >
                    <svg lucideChevronLeft [size]="18"></svg>
                  </button>
                  <span class="font-semibold text-foreground">
                    {{ currentMonthLabel(engine.monthGrids()[0]) }}
                  </span>
                  <button
                    sanringBtn
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label="下一月"
                    (click)="engine.nextMonth()"
                  >
                    <svg lucideChevronRight [size]="18"></svg>
                  </button>
                </div>

                <!-- 週標題 -->
                <div
                  class="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted"
                  role="row"
                  aria-hidden="true"
                >
                  @for (label of weekdayLabels(); track label) {
                    <span>{{ label }}</span>
                  }
                </div>

                <!-- 日格 -->
                <div class="grid grid-cols-7 gap-1" role="grid" aria-label="選擇日期">
                  @for (week of toWeeks(engine.monthGrids()[0]); track $index) {
                    <div role="row" class="contents">
                      @for (day of week; track day.date.getTime()) {
                        <button
                          role="gridcell"
                          type="button"
                          [attr.aria-selected]="day.isSelected ? true : null"
                          [attr.aria-label]="format(day.date, 'yyyy-MM-dd')"
                          [attr.data-testid]="'time-demo-day-' + format(day.date, 'yyyy-MM-dd')"
                          class="aspect-square rounded text-sm transition-colors active:brightness-90"
                          [class.text-muted]="!day.isCurrentMonth && !day.isSelected"
                          [class.text-foreground]="day.isCurrentMonth && !day.isSelected"
                          [class.bg-primary]="day.isSelected"
                          [class.text-primary-foreground]="day.isSelected"
                          [class.ring-2]="day.isFocused"
                          [class.ring-primary]="day.isFocused"
                          [class.font-bold]="day.isToday && !day.isSelected"
                          (click)="onDayClick(day)"
                        >
                          {{ day.date.getDate() }}
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- 右欄：時分調整 + 說明 -->
          <div class="flex flex-1 flex-col gap-4 pt-1 md:pt-2">
            <div>
              <h3 sanringCardTitle class="text-base" id="scenario-title-time-adjustment">
                ⑤ 時/分調整（Time Adjustment，M8）
              </h3>
              <p sanringCardDescription class="mt-1 text-sm text-muted">
                先點選日期，再調整時/分；每次切換小時、分鐘或 AM/PM 都會立即寫回 CalendarEngine
                的已選 Date。
              </p>
            </div>

            @if (engine.selectedDate(); as selected) {
              <div class="rounded-lg border border-border bg-surface p-4 flex flex-col gap-4">
                <p class="text-xs text-muted">
                  已選日期：<span class="font-mono text-foreground">{{
                    format(selected, 'yyyy-MM-dd')
                  }}</span>
                </p>

                <div
                  class="inline-flex w-fit rounded-lg border border-border bg-background p-1"
                  role="group"
                  aria-label="小時制"
                >
                  <button
                    sanringBtn
                    variant="ghost"
                    size="sm"
                    type="button"
                    data-testid="time-demo-hour-cycle-24"
                    [class.bg-surface-strong]="hourCycle() === 'h24'"
                    [attr.aria-pressed]="hourCycle() === 'h24'"
                    (click)="setHourCycle('h24')"
                  >
                    24 小時
                  </button>
                  <button
                    sanringBtn
                    variant="ghost"
                    size="sm"
                    type="button"
                    data-testid="time-demo-hour-cycle-12"
                    [class.bg-surface-strong]="hourCycle() === 'h12'"
                    [attr.aria-pressed]="hourCycle() === 'h12'"
                    (click)="setHourCycle('h12')"
                  >
                    12 小時
                  </button>
                </div>

                <!-- 時分調整器 -->
                <div class="flex items-center gap-4">
                  <div class="flex flex-col items-center gap-1">
                    <span class="text-xs text-muted">小時</span>
                    <button
                      sanringBtn
                      variant="ghost"
                      size="icon"
                      type="button"
                      (click)="adjustHours(1)"
                    >
                      ▲
                    </button>
                    <span
                      class="w-12 text-center font-mono text-2xl font-semibold text-foreground"
                      data-testid="time-demo-hours"
                      >{{ displayHour() }}</span
                    >
                    <button
                      sanringBtn
                      variant="ghost"
                      size="icon"
                      type="button"
                      (click)="adjustHours(-1)"
                    >
                      ▼
                    </button>
                  </div>

                  <span class="text-2xl font-bold text-muted pb-2">:</span>

                  <div class="flex flex-col items-center gap-1">
                    <span class="text-xs text-muted">分鐘</span>
                    <button
                      sanringBtn
                      variant="ghost"
                      size="icon"
                      type="button"
                      (click)="adjustMinutes(1)"
                    >
                      ▲
                    </button>
                    <span
                      class="w-12 text-center font-mono text-2xl font-semibold text-foreground"
                      data-testid="time-demo-minutes"
                      >{{ pad(draftMinutes()) }}</span
                    >
                    <button
                      sanringBtn
                      variant="ghost"
                      size="icon"
                      type="button"
                      (click)="adjustMinutes(-1)"
                    >
                      ▼
                    </button>
                  </div>

                  @if (hourCycle() === 'h12') {
                    <button
                      sanringBtn
                      variant="outline"
                      size="sm"
                      type="button"
                      class="self-center"
                      data-testid="time-demo-meridiem"
                      (click)="toggleMeridiem()"
                    >
                      {{ meridiem() }}
                    </button>
                  }
                </div>
              </div>
            } @else {
              <p class="text-sm text-muted">請先在左側日曆點選一個日期。</p>
            }

            <div
              class="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              data-testid="time-demo-result"
            >
              <span class="text-muted">已選 Date：</span>
              @if (engine.selectedDate(); as selected) {
                <span class="font-mono text-foreground">
                  {{ formatSelectedDate(selected) }}
                </span>
              } @else {
                <span class="text-muted">尚未選取</span>
              }
            </div>
          </div>
        </div>
      </sanring-card-content>
    </sanring-card>
  `,
})
export class TimeAdjustmentDemoComponent {
  private readonly locale = inject(CALENDAR_LOCALE);
  private readonly gridDirective = viewChild.required(CalendarGridDirective);

  /** CalendarEngine 由 CalendarGridDirective 自帶，透過 viewChild 拿同一份實例 */
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
    const totalMinutes = this.draftHours() * 60 + this.draftMinutes() + delta;
    const normalized = (totalMinutes + 24 * 60) % (24 * 60);
    this.draftHours.set(Math.floor(normalized / 60));
    this.draftMinutes.set(normalized % 60);
    this.applySelectedTime();
  }

  protected setHourCycle(hourCycle: TimeHourCycle): void {
    this.hourCycle.set(hourCycle);
  }

  protected toggleMeridiem(): void {
    this.draftHours.set((this.draftHours() + 12) % 24);
    this.applySelectedTime();
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

  protected pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  protected formatSelectedDate(date: Date): string {
    const pattern = this.hourCycle() === 'h24' ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd hh:mm:ss a';
    return format(date, pattern);
  }

  private formatTwelveHour(hours: number): string {
    const normalized = hours % 12;
    return this.pad(normalized === 0 ? 12 : normalized);
  }

  private applySelectedTime(): void {
    const selected = this.engine.selectedDate();
    if (selected === null) {
      return;
    }
    const next = new Date(selected);
    next.setHours(this.draftHours(), this.draftMinutes(), 0, 0);
    this.engine.setSelectedDate(next);
  }
}
