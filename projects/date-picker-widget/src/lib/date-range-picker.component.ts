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
import { isSameDay } from 'date-fns/isSameDay';
import {
  CALENDAR_TODAY,
  CalendarEngine,
  type CalendarDay,
  type CalendarLocale,
  type DateRange,
  type DisabledInput,
  type RangeDayCountLimit,
} from '@sanring/date-picker';
import { DEFAULT_DATE_FORMAT_CONFIG, type DateFormatConfig } from './date-format';
import { DatePickerOverlayShellComponent } from './date-picker-overlay-shell.component';

const EMPTY_RANGE: DateRange = { start: null, end: null };

let nextDialogId = 0;
type DateRangePickerTriggerMode = 'split' | 'combined';

/**
 * Range-mode composed DatePicker (PRD §7 DateRangePickerComponent, W2). Shares
 * the Overlay lifecycle shell and Tailwind styling approach with W1's
 * DatePickerComponent (PRD §4a) — the black-box precompiled CSS bundle is
 * still W4 scope, not built here.
 */
@Component({
  selector: 'sanring-date-range-picker',
  imports: [DatePickerOverlayShellComponent],
  templateUrl: './date-range-picker.component.html',
})
export class DateRangePickerComponent {
  private readonly parentTodayFn = inject(CALENDAR_TODAY);
  private readonly parentInjector = inject(Injector);

  readonly selectedRange = model<DateRange>(EMPTY_RANGE);
  readonly locale = input.required<CalendarLocale>();
  readonly disabled = input<DisabledInput | undefined>(undefined);
  readonly today = input<Date | undefined>(undefined);
  readonly format = input<DateFormatConfig>(DEFAULT_DATE_FORMAT_CONFIG);
  readonly placeholder = input('');
  readonly triggerMode = input<DateRangePickerTriggerMode>('split');
  readonly rangeDayCountLimit = input<RangeDayCountLimit | undefined>(undefined);
  readonly monthsToDisplay = input(2);
  readonly viewDate = input<Date | undefined>(undefined);
  readonly openedChange = output<boolean>();

  private readonly engineInjector = Injector.create({
    parent: this.parentInjector,
    providers: [
      CalendarEngine,
      { provide: CALENDAR_TODAY, useValue: () => this.today() ?? this.parentTodayFn() },
    ],
  });
  protected readonly engine = this.engineInjector.get(CalendarEngine);

  @ViewChild('startInputEl', { static: true })
  protected readonly startInputElRef!: ElementRef<HTMLInputElement>;
  @ViewChild('endInputEl', { static: true })
  protected readonly endInputElRef!: ElementRef<HTMLInputElement>;
  @ViewChild('combinedInputEl', { static: true })
  protected readonly combinedInputElRef!: ElementRef<HTMLInputElement>;
  @ViewChild('anchorEl', { static: true })
  protected readonly anchorElRef!: ElementRef<HTMLElement>;
  @ViewChild('gridEl') private readonly gridElRef?: ElementRef<HTMLDivElement>;
  @ViewChild(DatePickerOverlayShellComponent, { static: true })
  private readonly shell!: DatePickerOverlayShellComponent;

  protected readonly isOpen = computed(() => this.shell.isOpen());
  protected readonly startText = signal('');
  protected readonly endText = signal('');
  protected readonly startInvalid = signal(false);
  protected readonly endInvalid = signal(false);
  protected readonly dialogId = `sanring-date-range-picker-dialog-${nextDialogId++}`;
  protected readonly combinedText = computed(() => {
    const start = this.startText();
    const end = this.endText();
    if (start && end) return `${start} ~ ${end}`;
    if (start) return `${start} ~`;
    if (end) return `~ ${end}`;
    return '';
  });

  protected readonly weekdayLabels = computed(() => {
    const l = this.locale();
    return [...l.weekdayLabels.slice(l.weekStartsOn), ...l.weekdayLabels.slice(0, l.weekStartsOn)];
  });

  private lastFocusedField: 'start' | 'end' | 'combined' = 'start';

  constructor() {
    this.engine.setSelectionMode('range');

    effect(() => this.engine.setLocale(this.locale()));
    effect(() => this.engine.setDisabled(this.disabled()));
    effect(() => this.engine.setMonthsToDisplay(this.monthsToDisplay()));
    effect(() => this.engine.setRangeDayCountLimit(this.rangeDayCountLimit()));
    effect(() => {
      const vd = this.viewDate();
      if (vd !== undefined) this.engine.setViewDate(vd);
    });

    /** One direction only: external `[(selectedRange)]` writes -> engine (+ input text). See W1's equivalent comment for why this isn't a two-way effect pair. */
    effect(() => {
      const modelValue = this.selectedRange();
      untracked(() => {
        const current = this.engine.selectedRange();
        if (sameRange(modelValue, current)) {
          return;
        }
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
    this.startInvalid.set(false);
    this.endInvalid.set(false);
  }

  /** Synchronous engine -> model + input text sync for call sites that mutate the engine directly (grid clicks, keyboard selection). */
  private syncFromEngine(): void {
    const value = this.engine.selectedRange();
    if (!sameRange(value, this.selectedRange())) {
      this.selectedRange.set(value);
    }
    this.applyEngineRangeToText();
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

  protected onCombinedInputFocus(): void {
    this.lastFocusedField = 'combined';
    if (this.suppressNextFocusOpen) {
      this.suppressNextFocusOpen = false;
      return;
    }
    this.open();
  }

  /** Returning focus after a close() fires a native 'focus' event, which would otherwise re-open via on*InputFocus(). */
  private suppressNextFocusOpen = false;
  private refocusInputWithoutReopening(): void {
    this.suppressNextFocusOpen = true;
    const target =
      this.lastFocusedField === 'combined'
        ? this.combinedInputElRef
        : this.lastFocusedField === 'start'
          ? this.startInputElRef
          : this.endInputElRef;
    target.nativeElement.focus();
  }

  protected onStartInputChange(value: string): void {
    this.startText.set(value);
    this.tryCommitTyped();
  }

  protected onEndInputChange(value: string): void {
    this.endText.set(value);
    this.tryCommitTyped();
  }

  /**
   * Both fields must independently parse before attempting a commit — a Range
   * write is one indivisible transaction (Decision 3 precedent), so a half-typed
   * pair simply waits rather than partially committing.
   */
  private tryCommitTyped(): void {
    const startVal = this.startText();
    const endVal = this.endText();

    if (startVal === '' && endVal === '') {
      this.startInvalid.set(false);
      this.endInvalid.set(false);
      this.engine.clearSelection();
      this.selectedRange.set(EMPTY_RANGE);
      return;
    }

    const startParsed = startVal === '' ? null : this.format().parse(startVal);
    const endParsed = endVal === '' ? null : this.format().parse(endVal);
    this.startInvalid.set(startVal !== '' && startParsed === null);
    this.endInvalid.set(endVal !== '' && endParsed === null);

    if (startParsed === null || endParsed === null) {
      return;
    }

    this.engine.setSelectedRange({ start: startParsed, end: endParsed });
    const committed = this.engine.selectedRange();
    const succeeded =
      committed.start !== null &&
      committed.end !== null &&
      isSameDay(committed.start, startParsed) &&
      isSameDay(committed.end, endParsed);

    if (!succeeded) {
      // setSelectedRange() silently rejected the whole pair (disabled endpoint
      // or outside rangeDayCountLimit) — surface that instead of silently
      // claiming success (constitution I2/R8).
      this.startInvalid.set(true);
      this.endInvalid.set(true);
      return;
    }
    this.selectedRange.set(committed);
  }

  protected selectDate(date: Date): void {
    this.engine.selectDate(date);
    if (this.engine.isDraftActive()) {
      // First pick of the pair — reflect the Draft start immediately, keep the overlay open for the second pick.
      this.startText.set(this.format().format(date));
      this.endText.set('');
      this.startInvalid.set(false);
      this.endInvalid.set(false);
      return;
    }
    this.syncFromEngine();
    this.close();
    this.refocusInputWithoutReopening();
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // Mirrors CalendarGridDirective: Escape only aborts an in-progress Draft;
      // with no Draft active the outer shell decides whether to close (PRD §7).
      if (this.engine.isDraftActive()) {
        this.abortDraftAndResync();
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

  /** Backdrop click and any other shell close path funnel through here (PRD §7 Story 2 AC 2: abort Draft, keep prior committed values). */
  protected onShellClosed(): void {
    this.abortDraftAndResync();
    this.openedChange.emit(false);
  }

  /** Discards an in-progress Draft (Decision 3) and re-syncs the two input texts back to the engine's actual committed range — a mid-draft pick may have locally overwritten them (see selectDate()). */
  private abortDraftAndResync(): void {
    this.engine.abortRangeDraft();
    this.applyEngineRangeToText();
  }

  open(): void {
    if (this.shell.isOpen()) return;
    this.shell.open();
    this.openedChange.emit(true);
    queueMicrotask(() => this.gridElRef?.nativeElement.focus());
  }

  close(): void {
    if (!this.shell.isOpen()) return;
    this.shell.close();
  }
}

function sameRange(a: DateRange, b: DateRange): boolean {
  if (a.start === null || b.start === null) {
    if (a.start !== b.start) return false;
  } else if (!isSameDay(a.start, b.start)) {
    return false;
  }
  if (a.end === null || b.end === null) {
    return a.end === b.end;
  }
  return isSameDay(a.end, b.end);
}
