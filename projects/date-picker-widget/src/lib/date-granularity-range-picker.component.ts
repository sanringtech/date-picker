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
import {
  CALENDAR_QUARTER_STARTS_ON,
  CALENDAR_TODAY,
  GranularityPickerEngine,
  type CalendarLocale,
  type DateRange,
  type DisabledInput,
  type GranularityCell,
  type PickerGranularity,
  type QuarterStartMonth,
  type RangePeriodCountLimit,
} from '@sanring/date-picker';
import { DatePickerOverlayShellComponent } from './date-picker-overlay-shell.component';

let nextDialogId = 0;

const EMPTY_RANGE: DateRange = { start: null, end: null };

/**
 * Month/Quarter/Year range-mode picker (widget W6-range). Wraps
 * `GranularityPickerEngine` in 'range' mode — two readonly inputs display
 * the committed start/end period labels; the first grid click opens a
 * Draft, the second commits it. Escape while a Draft is active aborts
 * it (Decision 3 precedent); Escape with no active Draft closes the
 * overlay.
 */
@Component({
  selector: 'sanring-date-granularity-range-picker',
  imports: [DatePickerOverlayShellComponent],
  templateUrl: './date-granularity-range-picker.component.html',
})
export class DateGranularityRangePickerComponent {
  private readonly parentTodayFn = inject(CALENDAR_TODAY);
  private readonly parentInjector = inject(Injector);

  readonly granularity = input.required<PickerGranularity>();
  readonly selectedRange = model<DateRange>(EMPTY_RANGE);
  readonly locale = input.required<CalendarLocale>();
  /**
   * Required by the engine when `granularity: 'quarter'` — same lazy-token
   * convention as DateGranularityPickerComponent (ADR-0001 sub-decision 1).
   */
  readonly quarterStartMonth = input<QuarterStartMonth | undefined>(undefined);
  readonly disabled = input<DisabledInput | undefined>(undefined);
  readonly today = input<Date | undefined>(undefined);
  readonly placeholder = input('');
  readonly rangePeriodCountLimit = input<RangePeriodCountLimit | undefined>(undefined);
  readonly yearsToDisplay = input(12);
  readonly viewDate = input<Date | undefined>(undefined);
  readonly openedChange = output<boolean>();

  private readonly engineInjector = Injector.create({
    parent: this.parentInjector,
    providers: [
      GranularityPickerEngine,
      { provide: CALENDAR_TODAY, useValue: () => this.today() ?? this.parentTodayFn() },
      {
        provide: CALENDAR_QUARTER_STARTS_ON,
        useFactory: (): QuarterStartMonth => {
          const qsm = this.quarterStartMonth();
          if (qsm === undefined) {
            throw new Error(
              'sanring-date-granularity-range-picker: quarterStartMonth is required when granularity="quarter".',
            );
          }
          return qsm;
        },
      },
    ],
  });
  protected readonly engine = this.engineInjector.get(GranularityPickerEngine);

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
  protected readonly dialogId = `sanring-date-granularity-range-picker-dialog-${nextDialogId++}`;

  private lastFocusedField: 'start' | 'end' = 'start';

  constructor() {
    this.engine.setSelectionMode('range');

    effect(() => this.engine.setSelectionGranularity(this.granularity()));
    effect(() => this.engine.setDisabled(this.disabled()));
    effect(() => this.engine.setGridColumns(this.granularity() === 'quarter' ? 2 : 3));
    effect(() => this.engine.setYearsToDisplay(this.yearsToDisplay()));
    effect(() => this.engine.setRangePeriodCountLimit(this.rangePeriodCountLimit()));
    effect(() => { const vd = this.viewDate(); if (vd !== undefined) this.engine.setViewDate(vd); });

    /** One direction only: external `[(selectedRange)]` writes -> engine. See W1's equivalent comment. */
    effect(() => {
      const modelValue = this.selectedRange();
      untracked(() => {
        const current = this.engine.selectedRange();
        if (sameRange(modelValue, current)) return;
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
    this.startText.set(range.start ? this.periodLabel(range.start) : '');
    this.endText.set(range.end ? this.periodLabel(range.end) : '');
  }

  private syncFromEngine(): void {
    const value = this.engine.selectedRange();
    if (!sameRange(value, this.selectedRange())) {
      this.selectedRange.set(value);
    }
    this.applyEngineRangeToText();
  }

  protected gridColsClass(): string {
    return this.granularity() === 'quarter' ? 'grid-cols-2' : 'grid-cols-3';
  }

  protected cellLabel(cell: GranularityCell, index: number): string {
    switch (this.granularity()) {
      case 'month':
        return this.locale().monthLabels[cell.date.getMonth()];
      case 'quarter':
        return `Q${index + 1}`;
      case 'year':
        return `${cell.date.getFullYear()}`;
    }
  }

  protected headerLabel(): string {
    const cells = this.engine.granularityGrids();
    if (cells.length === 0) return '';
    if (this.granularity() === 'year') {
      return `${cells[0].date.getFullYear()} – ${cells[cells.length - 1].date.getFullYear()}`;
    }
    return `${cells[0].date.getFullYear()}`;
  }

  protected periodLabel(date: Date): string {
    switch (this.granularity()) {
      case 'month':
        return `${date.getFullYear()} ${this.locale().monthLabels[date.getMonth()]}`;
      case 'quarter': {
        const cells = this.engine.granularityGrids();
        const i = cells.findIndex((c) => c.date.getTime() === date.getTime());
        return `${date.getFullYear()} Q${i >= 0 ? i + 1 : '?'}`;
      }
      case 'year':
        return `${date.getFullYear()}`;
    }
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
      // First pick of the pair — show draft start immediately, keep overlay open.
      this.startText.set(this.periodLabel(date));
      this.endText.set('');
      return;
    }
    this.syncFromEngine();
    this.close();
    this.refocusInputWithoutReopening();
  }

  /** Backdrop click and shell close funnel here (abort Draft, keep prior committed values). */
  protected onShellClosed(): void {
    this.abortDraftAndResync();
    this.openedChange.emit(false);
  }

  private abortDraftAndResync(): void {
    this.engine.abortRangeDraft();
    this.applyEngineRangeToText();
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
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

  open(): void {
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
  const aStart = a.start?.getTime() ?? null;
  const bStart = b.start?.getTime() ?? null;
  const aEnd = a.end?.getTime() ?? null;
  const bEnd = b.end?.getTime() ?? null;
  return aStart === bStart && aEnd === bEnd;
}
