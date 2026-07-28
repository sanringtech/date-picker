import {
  Component,
  ElementRef,
  Injector,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { format as formatDate } from 'date-fns';
import {
  CALENDAR_TODAY,
  CalendarEngine,
  TimeAdjustmentEngine,
  type CalendarDay,
  type CalendarLocale,
  type DisabledInput,
  type TimeGuardMatcher,
  type TimePrecision,
} from '@sanring/date-picker-core';
import { DEFAULT_DATE_TIME_FORMAT_CONFIG, type DateFormatConfig } from './date-format';
import { DatePickerOverlayShellComponent } from './date-picker-overlay-shell.component';

let nextDialogId = 0;
const DRAFT_KEY = 'single';

/**
 * Date + time-of-day composed picker (widget PRD §10 W7 draft). Wraps
 * `CalendarEngine` (day grid, single mode) together with the standalone
 * `TimeAdjustmentEngine` (M8) — this is the actual "Widget package's
 * cross-engine write-back glue logic" that `date-picker.md`'s M8 acceptance
 * criteria had prematurely checked off (see the 2026-07-26 correction there).
 *
 * Picking a day opens a time Draft (defaulting to that day's existing
 * hour/minute, or midnight); adjusting the steppers keeps updating the same
 * Draft; nothing reaches the `[(selectedDate)]` model until "確認" composes
 * the full Date and confirms it — R9's Draft/Confirm requirement, mirrored
 * from Range's Draft precedent, is why the input is read-only here (a typed
 * string would need to bypass Draft/Confirm entirely, which isn't a
 * time-adjustment interface anymore).
 */
@Component({
  selector: 'sanring-date-time-picker',
  imports: [DatePickerOverlayShellComponent],
  templateUrl: './date-time-picker.component.html',
})
export class DateTimePickerComponent {
  private readonly parentTodayFn = inject(CALENDAR_TODAY);
  private readonly parentInjector = inject(Injector);

  readonly selectedDate = model<Date | null>(null);
  readonly locale = input.required<CalendarLocale>();
  readonly disabled = input<DisabledInput | undefined>(undefined);
  readonly allowDeselect = input(false);
  readonly today = input<Date | undefined>(undefined);
  readonly format = input<DateFormatConfig>(DEFAULT_DATE_TIME_FORMAT_CONFIG);
  readonly placeholder = input('');
  readonly precision = input<TimePrecision>('hour-minute');
  readonly timeGuard = input<TimeGuardMatcher | undefined>(undefined);
  readonly monthsToDisplay = input(1);
  readonly viewDate = input<Date | undefined>(undefined);
  readonly openedChange = output<boolean>();

  private readonly engineInjector = Injector.create({
    parent: this.parentInjector,
    providers: [
      CalendarEngine,
      TimeAdjustmentEngine,
      { provide: CALENDAR_TODAY, useValue: () => this.today() ?? this.parentTodayFn() },
    ],
  });
  protected readonly engine = this.engineInjector.get(CalendarEngine);
  protected readonly timeEngine = this.engineInjector.get(TimeAdjustmentEngine);

  @ViewChild('inputEl', { static: true })
  protected readonly inputElRef!: ElementRef<HTMLInputElement>;
  @ViewChild('gridEl') private readonly gridElRef?: ElementRef<HTMLDivElement>;
  @ViewChild(DatePickerOverlayShellComponent, { static: true })
  private readonly shell!: DatePickerOverlayShellComponent;

  protected readonly isOpen = computed(() => this.shell.isOpen());
  protected readonly inputValue = signal('');
  protected readonly dialogId = `sanring-date-time-picker-dialog-${nextDialogId++}`;

  /** UI-only draft display — TimeAdjustmentEngine's Draft map holds the real state. */
  protected readonly draftHours = signal(0);
  protected readonly draftMinutes = signal(0);
  protected readonly draftSeconds = signal(0);
  protected readonly hasDraft = signal(false);

  protected readonly weekdayLabels = computed(() => {
    const l = this.locale();
    return [...l.weekdayLabels.slice(l.weekStartsOn), ...l.weekdayLabels.slice(0, l.weekStartsOn)];
  });

  constructor() {
    effect(() => this.engine.setLocale(this.locale()));
    effect(() => this.engine.setDisabled(this.disabled()));
    effect(() => this.engine.setAllowDeselect(this.allowDeselect()));
    effect(() => this.engine.setMonthsToDisplay(this.monthsToDisplay()));
    effect(() => { const vd = this.viewDate(); if (vd !== undefined) this.engine.setViewDate(vd); });
    effect(() => this.timeEngine.setTimePrecision(this.precision()));
    effect(() => this.timeEngine.setTimeGuard(this.timeGuard()));

    /** One direction only: external `[(selectedDate)]` writes -> engine (+ input text). See W1's equivalent comment for why this isn't a two-way effect pair. */
    effect(() => {
      const modelValue = this.selectedDate();
      untracked(() => {
        if (modelValue === this.engine.selectedDate()) {
          return;
        }
        this.timeEngine.abortTimeDraft(DRAFT_KEY);
        this.hasDraft.set(false);
        if (modelValue === null) {
          this.engine.clearSelection();
        } else {
          this.engine.setSelectedDate(modelValue);
        }
        this.syncDraftClockFromValue(modelValue);
        this.inputValue.set(modelValue ? this.format().format(modelValue) : '');
      });
    });
  }

  private syncDraftClockFromValue(value: Date | null): void {
    this.draftHours.set(value?.getHours() ?? 0);
    this.draftMinutes.set(value?.getMinutes() ?? 0);
    this.draftSeconds.set(value?.getSeconds() ?? 0);
  }

  protected toWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) weeks.push(grid.slice(i, i + 7) as CalendarDay[]);
    return weeks;
  }

  protected currentMonthLabel(days: readonly CalendarDay[]): string {
    const current = days.find((d) => d.isCurrentMonth) ?? days[0];
    return `${current.date.getFullYear()} ${this.locale().monthLabels[current.date.getMonth()]}`;
  }

  protected dayAriaLabel(day: CalendarDay): string {
    return formatDate(day.date, 'yyyy-MM-dd');
  }

  protected onInputFocus(): void {
    if (this.suppressNextFocusOpen) {
      this.suppressNextFocusOpen = false;
      return;
    }
    this.open();
  }

  private suppressNextFocusOpen = false;
  private refocusInputWithoutReopening(): void {
    this.suppressNextFocusOpen = true;
    this.inputElRef.nativeElement.focus();
  }

  /**
   * Picking a day opens (or moves) the time Draft at that day's existing
   * hour/minute/second — a fresh un-confirmed click, so the day grid shows it
   * highlighted (via `engine.selectedDate()`) without touching the external
   * `[(selectedDate)]` model until confirmTime() (Range Draft precedent).
   */
  protected selectDay(date: Date): void {
    this.engine.selectDate(date);
    const picked = this.engine.selectedDate();
    if (picked === null) return; // disabled day — selectDate() was a no-op
    this.syncDraftClockFromValue(picked);
    this.pushDraft();
  }

  private pushDraft(): void {
    const base = this.engine.selectedDate();
    if (base === null) return;
    this.timeEngine.startOrUpdateTimeDraft(DRAFT_KEY, base, {
      hours: this.draftHours(),
      minutes: this.draftMinutes(),
      seconds: this.draftSeconds(),
    });
    this.hasDraft.set(true);
  }

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

  protected adjustSeconds(delta: number): void {
    const total = this.draftHours() * 3600 + this.draftMinutes() * 60 + this.draftSeconds() + delta;
    const normalized = (total + 24 * 3600) % (24 * 3600);
    this.draftHours.set(Math.floor(normalized / 3600));
    this.draftMinutes.set(Math.floor((normalized % 3600) / 60));
    this.draftSeconds.set(normalized % 60);
    this.pushDraft();
  }

  protected confirmTime(): void {
    const composed = this.timeEngine.confirmTimeDraft(DRAFT_KEY);
    this.hasDraft.set(false);
    if (composed === null) return;
    this.engine.setSelectedDate(composed);
    this.selectedDate.set(composed);
    this.inputValue.set(this.format().format(composed));
    this.close();
    this.refocusInputWithoutReopening();
  }

  /** Reverts both the time steppers and the day grid's highlight back to the last confirmed model value — a pending click/adjustment never reached the model, so there's nothing else to roll back (zero-rollback, Decision 3 precedent). */
  protected abortTime(): void {
    this.timeEngine.abortTimeDraft(DRAFT_KEY);
    this.hasDraft.set(false);
    const committed = this.selectedDate();
    if (committed !== null) {
      this.engine.setSelectedDate(committed);
    } else {
      this.engine.clearSelection();
    }
    this.syncDraftClockFromValue(committed);
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.hasDraft()) {
        this.abortTime();
      } else {
        this.close();
        this.refocusInputWithoutReopening();
      }
      event.preventDefault();
      return;
    }
    switch (event.key) {
      case 'ArrowLeft':
        this.engine.moveFocus('left');
        break;
      case 'ArrowRight':
        this.engine.moveFocus('right');
        break;
      case 'ArrowUp':
        this.engine.moveFocus('up');
        break;
      case 'ArrowDown':
        this.engine.moveFocus('down');
        break;
      case 'Home':
        this.engine.moveFocus('home');
        break;
      case 'End':
        this.engine.moveFocus('end');
        break;
      case 'PageUp':
        this.engine.moveFocus('pageup');
        break;
      case 'PageDown':
        this.engine.moveFocus('pagedown');
        break;
      case 'Enter':
      case ' ': {
        const focused = this.engine.focusedDate();
        if (focused !== null) this.selectDay(focused);
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  }

  open(): void {
    this.shell.open();
    this.openedChange.emit(true);
    queueMicrotask(() => this.gridElRef?.nativeElement.focus());
  }

  close(): void {
    if (!this.shell.isOpen()) return;
    this.shell.close();
    this.openedChange.emit(false);
  }
}
