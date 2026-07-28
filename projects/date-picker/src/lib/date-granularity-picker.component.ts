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
 * Month/Quarter/Year-picker composed DatePicker (widget PRD §10 W6 draft).
 * Single-selection only — engine `GranularityPickerEngine` (M7) also supports
 * Range/Multi for this same granularity axis, but wiring all nine
 * granularity×mode combinations into one component's template is deferred to
 * a follow-up; this is the common "pick one month/quarter/year" case (mirrors
 * how vue3-datepicker's month-picker/year-picker are single-value pickers).
 */
@Component({
  selector: 'sanring-date-granularity-picker',
  imports: [DatePickerOverlayShellComponent],
  templateUrl: './date-granularity-picker.component.html',
})
export class DateGranularityPickerComponent {
  private readonly parentTodayFn = inject(CALENDAR_TODAY);
  private readonly parentInjector = inject(Injector);

  readonly granularity = input.required<PickerGranularity>();
  readonly selectedDate = model<Date | null>(null);
  /** Only consumed for `granularity: 'month'` cell/header labels. */
  readonly locale = input.required<CalendarLocale>();
  /**
   * Required by the engine only when `granularity: 'quarter'` (ADR-0001
   * Zero-default parity) — omitted for month/year. Read lazily via a DI
   * `useFactory` below (not baked in as `useValue` at construction time) —
   * signal inputs only carry their real bound value *after* the constructor
   * returns (Angular applies property bindings post-construction), so a
   * direct read here would always observe the pre-binding default.
   */
  readonly quarterStartMonth = input<QuarterStartMonth | undefined>(undefined);
  readonly disabled = input<DisabledInput | undefined>(undefined);
  readonly allowDeselect = input(false);
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
        // Engine only calls injector.get() for this token when granularity is
        // actually 'quarter' (its own lazy-resolution comment) — month/year
        // consumers never trigger this factory, so they're never forced to
        // supply it either.
        useFactory: (): QuarterStartMonth => {
          const qsm = this.quarterStartMonth();
          if (qsm === undefined) {
            throw new Error(
              'sanring-date-granularity-picker: quarterStartMonth is required when granularity="quarter" (no default — a business calendar convention, not a neutral fact).',
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
  protected readonly dialogId = `sanring-date-granularity-picker-dialog-${nextDialogId++}`;

  constructor() {
    this.engine.setSelectionMode('single');

    effect(() => this.engine.setSelectionGranularity(this.granularity()));
    effect(() => this.engine.setDisabled(this.disabled()));
    effect(() => this.engine.setAllowDeselect(this.allowDeselect()));
    effect(() => this.engine.setGridColumns(this.granularity() === 'quarter' ? 2 : 3));
    effect(() => this.engine.setYearsToDisplay(this.yearsToDisplay()));
    effect(() => { const vd = this.viewDate(); if (vd !== undefined) this.engine.setViewDate(vd); });

    /** One direction only: external `[(selectedDate)]` writes -> engine (+ input text). See W1's equivalent comment for why this isn't a two-way effect pair. */
    effect(() => {
      const modelValue = this.selectedDate();
      untracked(() => {
        if (modelValue === this.engine.selectedDate()) {
          return;
        }
        if (modelValue === null) {
          this.engine.clearSelection();
        } else {
          this.engine.setSelectedDate(modelValue);
        }
        this.inputValue.set(modelValue ? this.periodLabel(modelValue) : '');
      });
    });
  }

  /** Synchronous engine -> model + input text sync for call sites that mutate the engine directly (grid clicks, keyboard selection). */
  private syncFromEngine(): void {
    const value = this.engine.selectedDate();
    if (value !== this.selectedDate()) {
      this.selectedDate.set(value);
    }
    this.inputValue.set(value ? this.periodLabel(value) : '');
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

  /** Display label for a committed value — quarter falls back to "Q?" if the value falls outside the currently displayed year window (findIndex miss), same as the engine demo page. */
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

  protected onInputFocus(): void {
    if (this.suppressNextFocusOpen) {
      this.suppressNextFocusOpen = false;
      return;
    }
    this.open();
  }

  /** Returning focus to the input after a close() fires a native 'focus' event, which would otherwise re-open via onInputFocus(). */
  private suppressNextFocusOpen = false;
  private refocusInputWithoutReopening(): void {
    this.suppressNextFocusOpen = true;
    this.inputElRef.nativeElement.focus();
  }

  protected selectDate(date: Date): void {
    this.engine.selectDate(date);
    this.syncFromEngine();
    this.close();
    this.refocusInputWithoutReopening();
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
