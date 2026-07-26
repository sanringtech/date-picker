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
  type CalendarDay,
  type CalendarLocale,
  type DisabledInput,
} from '@sanring/date-picker';
import { DEFAULT_DATE_FORMAT_CONFIG, type DateFormatConfig } from './date-format';
import { DatePickerOverlayShellComponent } from './date-picker-overlay-shell.component';

let nextDialogId = 0;

/**
 * Multi-mode composed DatePicker (widget PRD §10 W5 draft). Wraps engine
 * `selectionMode: 'multi'` (M6) — a toggle-collection selection with no
 * Draft state, unlike Range — so unlike W1/W2 the overlay stays open after
 * each pick and only closes on Escape/backdrop click, letting the user
 * accumulate several dates in one session.
 */
@Component({
  selector: 'sanring-date-multi-picker',
  imports: [DatePickerOverlayShellComponent],
  templateUrl: './date-multi-picker.component.html',
})
export class DateMultiPickerComponent {
  private readonly parentTodayFn = inject(CALENDAR_TODAY);
  private readonly parentInjector = inject(Injector);

  readonly selectedDates = model<Date[]>([]);
  readonly locale = input.required<CalendarLocale>();
  readonly disabled = input<DisabledInput | undefined>(undefined);
  readonly today = input<Date | undefined>(undefined);
  readonly format = input<DateFormatConfig>(DEFAULT_DATE_FORMAT_CONFIG);
  readonly placeholder = input('');
  readonly openedChange = output<boolean>();

  private readonly engineInjector = Injector.create({
    parent: this.parentInjector,
    providers: [
      CalendarEngine,
      { provide: CALENDAR_TODAY, useValue: () => this.today() ?? this.parentTodayFn() },
    ],
  });
  protected readonly engine = this.engineInjector.get(CalendarEngine);

  @ViewChild('inputEl', { static: true })
  protected readonly inputElRef!: ElementRef<HTMLInputElement>;
  @ViewChild('gridEl') private readonly gridElRef?: ElementRef<HTMLDivElement>;
  @ViewChild(DatePickerOverlayShellComponent, { static: true })
  private readonly shell!: DatePickerOverlayShellComponent;

  protected readonly isOpen = computed(() => this.shell.isOpen());
  protected readonly inputValue = signal('');
  protected readonly invalid = signal(false);
  protected readonly dialogId = `sanring-date-multi-picker-dialog-${nextDialogId++}`;

  /** Chronological display order — the engine's Map preserves insertion order, not date order. */
  protected readonly sortedSelectedDates = computed(() =>
    [...this.engine.selectedDates()].sort((a, b) => a.getTime() - b.getTime()),
  );

  protected readonly weekdayLabels = computed(() => {
    const l = this.locale();
    return [...l.weekdayLabels.slice(l.weekStartsOn), ...l.weekdayLabels.slice(0, l.weekStartsOn)];
  });

  constructor() {
    this.engine.setSelectionMode('multi');

    effect(() => this.engine.setLocale(this.locale()));
    effect(() => this.engine.setDisabled(this.disabled()));

    /**
     * One direction only: external `[(selectedDates)]` writes -> engine (+ input
     * text). See W1's equivalent comment for why this isn't a two-way effect pair.
     */
    effect(() => {
      const modelValue = this.selectedDates();
      untracked(() => {
        if (sameDateSet(modelValue, this.engine.selectedDates())) {
          return;
        }
        this.engine.setSelectedDates(modelValue);
        this.applyEngineDatesToText();
      });
    });
  }

  private applyEngineDatesToText(): void {
    const dates = this.sortedSelectedDates();
    this.inputValue.set(dates.map((d) => this.format().format(d)).join(', '));
    this.invalid.set(false);
  }

  /** Synchronous engine -> model + input text sync for call sites that mutate the engine directly (grid clicks, chip removal, keyboard selection). */
  private syncFromEngine(): void {
    const value = this.engine.selectedDates();
    if (!sameDateSet(value, this.selectedDates())) {
      this.selectedDates.set(value);
    }
    this.applyEngineDatesToText();
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

  protected chipAriaLabel(date: Date): string {
    return formatDate(date, 'yyyy-MM-dd');
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

  /**
   * Typed input is a comma-separated list, parsed as one indivisible batch
   * (Range's "wait for the whole transaction" precedent) — a half-typed
   * trailing entry simply waits rather than partially committing.
   */
  protected onInputChange(value: string): void {
    this.inputValue.set(value);
    if (value.trim() === '') {
      this.invalid.set(false);
      this.engine.clearSelection();
      this.selectedDates.set([]);
      return;
    }
    const entries = value.split(',').map((v) => v.trim());
    if (entries.some((v) => v === '')) {
      // Trailing/empty comma segment — still typing, wait rather than reject.
      return;
    }
    const parsed = entries.map((v) => this.format().parse(v));
    if (parsed.some((d) => d === null)) {
      this.invalid.set(true);
      return;
    }
    this.engine.setSelectedDates(parsed as Date[]);
    const committed = this.engine.selectedDates();
    // setSelectedDates() silently drops disabled/duplicate entries (I2, Decision 13) —
    // surface that instead of silently claiming every typed entry stuck.
    this.invalid.set(committed.length !== new Set(entries).size);
    this.selectedDates.set(committed);
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
  const keysB = new Set(b.map((d) => d.toDateString()));
  return a.every((d) => keysB.has(d.toDateString()));
}
