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
  type DisabledInput,
  type GranularityCell,
  type PickerGranularity,
  type QuarterStartMonth,
} from '@sanring/date-picker-core';
import { DatePickerOverlayShellComponent } from './date-picker-overlay-shell.component';

let nextDialogId = 0;

/**
 * Month/Quarter/Year multi-mode picker (widget W6-multi). Wraps
 * `GranularityPickerEngine` in 'multi' mode — toggle collection with no
 * Draft state, so the overlay stays open after each pick. Chips in the
 * panel show each selected period; individual remove buttons and a
 * "清除全部" action mirror W5's DateMultiPickerComponent UX.
 */
@Component({
  selector: 'sanring-date-granularity-multi-picker',
  imports: [DatePickerOverlayShellComponent],
  templateUrl: './date-granularity-multi-picker.component.html',
})
export class DateGranularityMultiPickerComponent {
  private readonly parentTodayFn = inject(CALENDAR_TODAY);
  private readonly parentInjector = inject(Injector);

  readonly granularity = input.required<PickerGranularity>();
  readonly selectedDates = model<Date[]>([]);
  readonly locale = input.required<CalendarLocale>();
  /**
   * Required by the engine when `granularity: 'quarter'` — same lazy-token
   * convention as DateGranularityPickerComponent (ADR-0001 sub-decision 1).
   */
  readonly quarterStartMonth = input<QuarterStartMonth | undefined>(undefined);
  readonly disabled = input<DisabledInput | undefined>(undefined);
  readonly today = input<Date | undefined>(undefined);
  readonly placeholder = input('');
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
              'sanring-date-granularity-multi-picker: quarterStartMonth is required when granularity="quarter".',
            );
          }
          return qsm;
        },
      },
    ],
  });
  protected readonly engine = this.engineInjector.get(GranularityPickerEngine);

  @ViewChild('inputEl', { static: true })
  protected readonly inputElRef!: ElementRef<HTMLInputElement>;
  @ViewChild('gridEl') private readonly gridElRef?: ElementRef<HTMLDivElement>;
  @ViewChild(DatePickerOverlayShellComponent, { static: true })
  private readonly shell!: DatePickerOverlayShellComponent;

  protected readonly isOpen = computed(() => this.shell.isOpen());
  protected readonly inputValue = signal('');
  protected readonly dialogId = `sanring-date-granularity-multi-picker-dialog-${nextDialogId++}`;

  /** Chronological display order — the engine's Map preserves insertion order, not date order. */
  protected readonly sortedSelectedDates = computed(() =>
    [...this.engine.selectedDates()].sort((a, b) => a.getTime() - b.getTime()),
  );

  constructor() {
    this.engine.setSelectionMode('multi');

    effect(() => this.engine.setSelectionGranularity(this.granularity()));
    effect(() => this.engine.setDisabled(this.disabled()));
    effect(() => this.engine.setGridColumns(this.granularity() === 'quarter' ? 2 : 3));
    effect(() => this.engine.setYearsToDisplay(this.yearsToDisplay()));
    effect(() => { const vd = this.viewDate(); if (vd !== undefined) this.engine.setViewDate(vd); });

    /** One direction only: external `[(selectedDates)]` writes -> engine. See W1's equivalent comment. */
    effect(() => {
      const modelValue = this.selectedDates();
      untracked(() => {
        if (sameDateSet(modelValue, this.engine.selectedDates())) return;
        this.engine.setSelectedDates(modelValue);
        this.applyEngineDatesToText();
      });
    });
  }

  private applyEngineDatesToText(): void {
    const dates = this.sortedSelectedDates();
    this.inputValue.set(dates.map((d) => this.periodLabel(d)).join(', '));
  }

  private syncFromEngine(): void {
    const value = this.engine.selectedDates();
    if (!sameDateSet(value, this.selectedDates())) {
      this.selectedDates.set(value);
    }
    this.applyEngineDatesToText();
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

  protected chipAriaLabel(date: Date): string {
    return this.periodLabel(date);
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

  protected selectDate(date: Date): void {
    this.engine.selectDate(date);
    this.syncFromEngine();
  }

  protected removeDate(date: Date): void {
    this.engine.removeDate(date);
    this.syncFromEngine();
  }

  protected clearAll(): void {
    this.engine.clearSelection();
    this.syncFromEngine();
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
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
    this.openedChange.emit(false);
  }
}

function sameDateSet(a: readonly Date[], b: readonly Date[]): boolean {
  if (a.length !== b.length) return false;
  const timesB = new Set(b.map((d) => d.getTime()));
  return a.every((d) => timesB.has(d.getTime()));
}
