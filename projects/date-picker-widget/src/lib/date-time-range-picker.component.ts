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
  type DateRange,
  type DisabledInput,
  type RangeDayCountLimit,
  type TimeGuardMatcher,
  type TimePrecision,
} from '@sanring/date-picker';
import { DEFAULT_DATE_TIME_FORMAT_CONFIG, type DateFormatConfig } from './date-format';
import { DatePickerOverlayShellComponent } from './date-picker-overlay-shell.component';

let nextDialogId = 0;

const EMPTY_RANGE: DateRange = { start: null, end: null };
const START_KEY = 'range-start';
const END_KEY = 'range-end';

/**
 * Date + time-of-day range picker (W8). Combines `CalendarEngine` in 'range'
 * mode with two `TimeAdjustmentEngine` Draft slots ('range-start' / 'range-end').
 *
 * Flow: two date clicks commit the day range (identical to W2) → time stepper
 * section appears for both endpoints simultaneously → "確認" composes both
 * full Dates and writes the final DateRange to the model. Re-opening an
 * existing range immediately reopens the time section pre-filled with the
 * current hour/minute values. "中止" or Escape (while Draft active) reverts
 * both time Drafts to the last committed model value (Decision 3 precedent).
 */
@Component({
  selector: 'sanring-date-time-range-picker',
  imports: [DatePickerOverlayShellComponent],
  templateUrl: './date-time-range-picker.component.html',
})
export class DateTimeRangePickerComponent {
  private readonly parentTodayFn = inject(CALENDAR_TODAY);
  private readonly parentInjector = inject(Injector);

  readonly selectedRange = model<DateRange>(EMPTY_RANGE);
  readonly locale = input.required<CalendarLocale>();
  readonly disabled = input<DisabledInput | undefined>(undefined);
  readonly today = input<Date | undefined>(undefined);
  readonly format = input<DateFormatConfig>(DEFAULT_DATE_TIME_FORMAT_CONFIG);
  readonly placeholder = input('');
  readonly rangeDayCountLimit = input<RangeDayCountLimit | undefined>(undefined);
  readonly monthsToDisplay = input(2);
  readonly viewDate = input<Date | undefined>(undefined);
  readonly precision = input<TimePrecision>('hour-minute');
  readonly timeGuard = input<TimeGuardMatcher | undefined>(undefined);
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

  @ViewChild('startInputEl', { static: true })
  protected readonly startInputElRef!: ElementRef<HTMLInputElement>;
  @ViewChild('endInputEl', { static: true })
  protected readonly endInputElRef!: ElementRef<HTMLInputElement>;
  @ViewChild('anchorEl', { static: true })
  protected readonly anchorElRef!: ElementRef<HTMLElement>;
  @ViewChild('gridEl') private readonly gridElRef?: ElementRef<HTMLDivElement>;
  @ViewChild(DatePickerOverlayShellComponent, { static: true })
  private readonly shell!: DatePickerOverlayShellComponent;

  protected readonly isOpen = computed(() => this.shell.isOpen());
  protected readonly startText = signal('');
  protected readonly endText = signal('');
  protected readonly dialogId = `sanring-date-time-range-picker-dialog-${nextDialogId++}`;

  /** UI-only draft display — TimeAdjustmentEngine's Draft map holds the real state. */
  protected readonly startDraftHours = signal(0);
  protected readonly startDraftMinutes = signal(0);
  protected readonly startDraftSeconds = signal(0);
  protected readonly endDraftHours = signal(0);
  protected readonly endDraftMinutes = signal(0);
  protected readonly endDraftSeconds = signal(0);
  protected readonly hasDraft = signal(false);

  protected readonly weekdayLabels = computed(() => {
    const l = this.locale();
    return [...l.weekdayLabels.slice(l.weekStartsOn), ...l.weekdayLabels.slice(0, l.weekStartsOn)];
  });

  private lastFocusedField: 'start' | 'end' = 'start';

  constructor() {
    this.engine.setSelectionMode('range');

    effect(() => this.engine.setLocale(this.locale()));
    effect(() => this.engine.setDisabled(this.disabled()));
    effect(() => this.engine.setMonthsToDisplay(this.monthsToDisplay()));
    effect(() => this.engine.setRangeDayCountLimit(this.rangeDayCountLimit()));
    effect(() => { const vd = this.viewDate(); if (vd !== undefined) this.engine.setViewDate(vd); });
    effect(() => this.timeEngine.setTimePrecision(this.precision()));
    effect(() => this.timeEngine.setTimeGuard(this.timeGuard()));

    /** One direction only: external `[(selectedRange)]` writes -> engine. See W1's equivalent comment. */
    effect(() => {
      const modelValue = this.selectedRange();
      untracked(() => {
        const current = this.engine.selectedRange();
        if (sameRange(modelValue, current)) return;
        this.timeEngine.abortTimeDraft(START_KEY);
        this.timeEngine.abortTimeDraft(END_KEY);
        this.hasDraft.set(false);
        if (modelValue.start === null && modelValue.end === null) {
          this.engine.clearSelection();
        } else if (modelValue.start !== null && modelValue.end !== null) {
          this.engine.setSelectedRange(modelValue);
        }
        this.applyEngineRangeToText();
      });
    });
  }

  private applyEngineRangeToText(): void {
    const range = this.engine.selectedRange();
    this.startText.set(range.start ? this.format().format(range.start) : '');
    this.endText.set(range.end ? this.format().format(range.end) : '');
  }

  private syncFromEngine(): void {
    const value = this.engine.selectedRange();
    if (!sameRange(value, this.selectedRange())) {
      this.selectedRange.set(value);
    }
    this.applyEngineRangeToText();
  }

  private syncDraftClocksFromRange(range: DateRange): void {
    this.startDraftHours.set(range.start?.getHours() ?? 0);
    this.startDraftMinutes.set(range.start?.getMinutes() ?? 0);
    this.startDraftSeconds.set(range.start?.getSeconds() ?? 0);
    this.endDraftHours.set(range.end?.getHours() ?? 0);
    this.endDraftMinutes.set(range.end?.getMinutes() ?? 0);
    this.endDraftSeconds.set(range.end?.getSeconds() ?? 0);
  }

  private pushTimeDrafts(): void {
    const range = this.engine.selectedRange();
    if (range.start === null || range.end === null) return;
    this.timeEngine.startOrUpdateTimeDraft(START_KEY, range.start, {
      hours: this.startDraftHours(),
      minutes: this.startDraftMinutes(),
      seconds: this.startDraftSeconds(),
    });
    this.timeEngine.startOrUpdateTimeDraft(END_KEY, range.end, {
      hours: this.endDraftHours(),
      minutes: this.endDraftMinutes(),
      seconds: this.endDraftSeconds(),
    });
    this.hasDraft.set(true);
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
    const base = formatDate(day.date, 'yyyy-MM-dd');
    if (day.isRangeStart) return `${base}（區間起點）`;
    if (day.isRangeEnd) return `${base}（區間終點）`;
    return base;
  }

  protected onStartInputFocus(): void {
    this.lastFocusedField = 'start';
    if (this.suppressNextFocusOpen) {
      this.suppressNextFocusOpen = false;
      return;
    }
    this.open();
  }

  protected onEndInputFocus(): void {
    this.lastFocusedField = 'end';
    if (this.suppressNextFocusOpen) {
      this.suppressNextFocusOpen = false;
      return;
    }
    this.open();
  }

  private suppressNextFocusOpen = false;
  private refocusInputWithoutReopening(): void {
    this.suppressNextFocusOpen = true;
    const target = this.lastFocusedField === 'start' ? this.startInputElRef : this.endInputElRef;
    target.nativeElement.focus();
  }

  protected selectDate(date: Date): void {
    this.engine.selectDate(date);
    if (this.engine.isDraftActive()) {
      // First pick of the date pair — show start, abort any stale time drafts.
      this.startText.set(this.format().format(date));
      this.endText.set('');
      this.timeEngine.abortTimeDraft(START_KEY);
      this.timeEngine.abortTimeDraft(END_KEY);
      this.hasDraft.set(false);
      return;
    }
    // Both dates committed — sync clocks from the new midnight dates and open time drafts.
    const range = this.engine.selectedRange();
    this.syncDraftClocksFromRange(range);
    this.pushTimeDrafts();
  }

  // --- Start time steppers (carry-over mirrors W7's adjustHours/Minutes/Seconds) ---

  protected adjustStartHours(delta: number): void {
    this.startDraftHours.set((this.startDraftHours() + delta + 24) % 24);
    this.pushTimeDrafts();
  }

  protected adjustStartMinutes(delta: number): void {
    const total = this.startDraftHours() * 60 + this.startDraftMinutes() + delta;
    const normalized = (total + 24 * 60) % (24 * 60);
    this.startDraftHours.set(Math.floor(normalized / 60));
    this.startDraftMinutes.set(normalized % 60);
    this.pushTimeDrafts();
  }

  protected adjustStartSeconds(delta: number): void {
    const total =
      this.startDraftHours() * 3600 + this.startDraftMinutes() * 60 + this.startDraftSeconds() + delta;
    const normalized = (total + 24 * 3600) % (24 * 3600);
    this.startDraftHours.set(Math.floor(normalized / 3600));
    this.startDraftMinutes.set(Math.floor((normalized % 3600) / 60));
    this.startDraftSeconds.set(normalized % 60);
    this.pushTimeDrafts();
  }

  // --- End time steppers ---

  protected adjustEndHours(delta: number): void {
    this.endDraftHours.set((this.endDraftHours() + delta + 24) % 24);
    this.pushTimeDrafts();
  }

  protected adjustEndMinutes(delta: number): void {
    const total = this.endDraftHours() * 60 + this.endDraftMinutes() + delta;
    const normalized = (total + 24 * 60) % (24 * 60);
    this.endDraftHours.set(Math.floor(normalized / 60));
    this.endDraftMinutes.set(normalized % 60);
    this.pushTimeDrafts();
  }

  protected adjustEndSeconds(delta: number): void {
    const total =
      this.endDraftHours() * 3600 + this.endDraftMinutes() * 60 + this.endDraftSeconds() + delta;
    const normalized = (total + 24 * 3600) % (24 * 3600);
    this.endDraftHours.set(Math.floor(normalized / 3600));
    this.endDraftMinutes.set(Math.floor((normalized % 3600) / 60));
    this.endDraftSeconds.set(normalized % 60);
    this.pushTimeDrafts();
  }

  protected confirmTime(): void {
    const composedStart = this.timeEngine.confirmTimeDraft(START_KEY);
    const composedEnd = this.timeEngine.confirmTimeDraft(END_KEY);
    this.hasDraft.set(false);
    if (composedStart === null || composedEnd === null) return;
    this.engine.setSelectedRange({ start: composedStart, end: composedEnd });
    this.syncFromEngine();
    this.close();
    this.refocusInputWithoutReopening();
  }

  /**
   * Reverts both time Drafts and restores the engine's day grid back to the
   * last committed model range — zero-rollback (Decision 3 precedent): the
   * Drafts were never written to the model, so there's nothing else to undo.
   */
  protected abortTime(): void {
    this.timeEngine.abortTimeDraft(START_KEY);
    this.timeEngine.abortTimeDraft(END_KEY);
    this.hasDraft.set(false);
    const committed = this.selectedRange();
    if (committed.start !== null && committed.end !== null) {
      this.engine.setSelectedRange(committed);
    } else {
      this.engine.clearSelection();
    }
    this.syncDraftClocksFromRange(committed);
    this.applyEngineRangeToText();
  }

  protected onShellClosed(): void {
    if (this.hasDraft()) {
      this.abortTime();
    } else {
      this.engine.abortRangeDraft();
      this.applyEngineRangeToText();
    }
    this.openedChange.emit(false);
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.hasDraft()) {
        this.abortTime();
        event.preventDefault();
        return;
      }
      if (this.engine.isDraftActive()) {
        this.engine.abortRangeDraft();
        this.applyEngineRangeToText();
        event.preventDefault();
        return;
      }
      this.close();
      this.refocusInputWithoutReopening();
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
        if (focused !== null) this.selectDate(focused);
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
    // Re-open time drafts immediately if a committed range already exists.
    const range = this.engine.selectedRange();
    if (range.start !== null && range.end !== null) {
      this.syncDraftClocksFromRange(range);
      this.pushTimeDrafts();
    }
    queueMicrotask(() => this.gridElRef?.nativeElement.focus());
  }

  close(): void {
    if (!this.shell.isOpen()) return;
    this.shell.close();
  }
}

function sameRange(a: DateRange, b: DateRange): boolean {
  const aStart = a.start?.getTime() ?? null;
  const bStart = b.start?.getTime() ?? null;
  const aEnd = a.end?.getTime() ?? null;
  const bEnd = b.end?.getTime() ?? null;
  return aStart === bStart && aEnd === bEnd;
}
