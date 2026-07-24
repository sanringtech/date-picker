import { Component, computed, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import { ButtonDirective } from './components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from './components/ui/card';
import { FIXED_TODAY } from './app.config';

type TimeHourCycle = 'h12' | 'h24';

@Component({
  selector: 'app-time-picker-demo',
  imports: [
    ButtonDirective,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
    LucideChevronUp,
    LucideChevronDown,
  ],
  template: `
    <sanring-card class="w-full overflow-hidden">
      <sanring-card-content class="p-5 md:p-6">
        <div class="flex flex-col items-start gap-6 md:flex-row">
          <div class="w-full max-w-[22rem] shrink-0 sm:w-88">
            <div
              class="rounded-lg border border-border bg-background p-4 shadow-inner transition-shadow focus-within:ring-2 focus-within:ring-primary"
              data-testid="time-picker-panel"
            >
              <div
                class="inline-flex rounded-lg border border-border bg-surface p-1"
                role="group"
                aria-label="小時制"
              >
                <button
                  sanringBtn
                  variant="ghost"
                  size="sm"
                  type="button"
                  data-testid="time-picker-hour-cycle-24"
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
                  data-testid="time-picker-hour-cycle-12"
                  [class.bg-surface-strong]="hourCycle() === 'h12'"
                  [attr.aria-pressed]="hourCycle() === 'h12'"
                  (click)="setHourCycle('h12')"
                >
                  12 小時
                </button>
              </div>

              <div class="mt-5 flex items-center justify-center gap-4">
                <div class="flex flex-col items-center gap-1">
                  <span class="text-xs text-muted">小時</span>
                  <button
                    sanringBtn
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label="增加小時"
                    data-testid="time-picker-hour-up"
                    (click)="adjustHours(1)"
                  >
                    <svg lucideChevronUp [size]="18"></svg>
                  </button>
                  <span
                    class="w-14 text-center font-mono text-3xl font-semibold text-foreground"
                    data-testid="time-picker-hours"
                    >{{ displayHour() }}</span
                  >
                  <button
                    sanringBtn
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label="減少小時"
                    data-testid="time-picker-hour-down"
                    (click)="adjustHours(-1)"
                  >
                    <svg lucideChevronDown [size]="18"></svg>
                  </button>
                </div>

                <span class="pb-2 text-3xl font-bold text-muted">:</span>

                <div class="flex flex-col items-center gap-1">
                  <span class="text-xs text-muted">分鐘</span>
                  <button
                    sanringBtn
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label="增加分鐘"
                    data-testid="time-picker-minute-up"
                    (click)="adjustMinutes(minuteStep)"
                  >
                    <svg lucideChevronUp [size]="18"></svg>
                  </button>
                  <span
                    class="w-14 text-center font-mono text-3xl font-semibold text-foreground"
                    data-testid="time-picker-minutes"
                    >{{ pad(draftMinutes()) }}</span
                  >
                  <button
                    sanringBtn
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label="減少分鐘"
                    data-testid="time-picker-minute-down"
                    (click)="adjustMinutes(-minuteStep)"
                  >
                    <svg lucideChevronDown [size]="18"></svg>
                  </button>
                </div>

                @if (hourCycle() === 'h12') {
                  <button
                    sanringBtn
                    variant="outline"
                    size="sm"
                    type="button"
                    class="self-center"
                    data-testid="time-picker-meridiem"
                    (click)="toggleMeridiem()"
                  >
                    {{ meridiem() }}
                  </button>
                }
              </div>

              <div class="mt-5 flex gap-2">
                <button
                  sanringBtn
                  variant="outline"
                  size="sm"
                  type="button"
                  data-testid="time-picker-reset"
                  (click)="resetTime()"
                >
                  重設
                </button>
              </div>

              <div
                class="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                data-testid="time-picker-result"
              >
                <span class="text-muted">已選時間：</span>
                <span class="font-mono text-foreground">
                  {{ selectedTimeLabel() }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex-1 pt-1 md:pt-2">
            <h3 sanringCardTitle class="text-base" id="scenario-title-time-picker">
              ⑥ 獨立時分選擇器（Time Picker）
            </h3>
            <p sanringCardDescription class="mt-1 text-sm text-muted">
              不經過日曆格，直接選擇時與分；每次切換小時、分鐘或 AM/PM 都會立即更新已選時間。
            </p>
          </div>
        </div>
      </sanring-card-content>
    </sanring-card>
  `,
})
export class TimePickerDemoComponent {
  private readonly baseDate = FIXED_TODAY;

  protected readonly minuteStep = 5;
  protected readonly draftHours = signal(9);
  protected readonly draftMinutes = signal(30);
  protected readonly hourCycle = signal<TimeHourCycle>('h24');
  protected readonly displayHour = computed(() =>
    this.hourCycle() === 'h24'
      ? this.pad(this.draftHours())
      : this.formatTwelveHour(this.draftHours()),
  );
  protected readonly meridiem = computed(() => (this.draftHours() < 12 ? 'AM' : 'PM'));
  protected readonly selectedTime = computed(() => {
    const selected = new Date(this.baseDate);
    selected.setHours(this.draftHours(), this.draftMinutes(), 0, 0);
    return selected;
  });
  protected readonly selectedTimeLabel = computed(() =>
    this.formatSelectedTime(this.selectedTime()),
  );

  protected adjustHours(delta: number): void {
    this.draftHours.set((this.draftHours() + delta + 24) % 24);
  }

  protected adjustMinutes(delta: number): void {
    const totalMinutes = this.draftHours() * 60 + this.draftMinutes() + delta;
    const normalized = (totalMinutes + 24 * 60) % (24 * 60);
    this.draftHours.set(Math.floor(normalized / 60));
    this.draftMinutes.set(normalized % 60);
  }

  protected setHourCycle(hourCycle: TimeHourCycle): void {
    this.hourCycle.set(hourCycle);
  }

  protected toggleMeridiem(): void {
    this.draftHours.set((this.draftHours() + 12) % 24);
  }

  protected resetTime(): void {
    this.draftHours.set(9);
    this.draftMinutes.set(30);
  }

  protected pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  protected formatSelectedTime(date: Date): string {
    const pattern = this.hourCycle() === 'h24' ? 'HH:mm' : 'hh:mm a';
    return format(date, pattern);
  }

  private formatTwelveHour(hours: number): string {
    const normalized = hours % 12;
    return this.pad(normalized === 0 ? 12 : normalized);
  }
}
