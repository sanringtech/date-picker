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
 * Single-mode composed DatePicker (PRD §7). Styling uses Tailwind utility
 * classes matching the engine demo (docs `styles.css` maps them to `--dp-*`
 * custom properties) — the black-box npm precompiled CSS bundle that makes
 * this render correctly without a consumer Tailwind pipeline is W4 scope,
 * not yet built.
 */
@Component({
  selector: 'sanring-date-picker',
  imports: [DatePickerOverlayShellComponent],
  templateUrl: './date-picker.component.html',
})
export class DatePickerComponent {
  private readonly parentTodayFn = inject(CALENDAR_TODAY);
  private readonly parentInjector = inject(Injector);

  readonly selectedDate = model<Date | null>(null);
  readonly locale = input.required<CalendarLocale>();
  readonly disabled = input<DisabledInput | undefined>(undefined);
  readonly allowDeselect = input(false);
  readonly today = input<Date | undefined>(undefined);
  readonly format = input<DateFormatConfig>(DEFAULT_DATE_FORMAT_CONFIG);
  readonly placeholder = input('');
  readonly openedChange = output<boolean>();

  /**
   * Own child injector (not the `providers` array) so CALENDAR_TODAY can read
   * the `today` input reactively without Angular reporting a circular
   * dependency (CalendarEngine would otherwise resolve CALENDAR_TODAY through
   * this same component's own DI node while the component is still under
   * construction).
   */
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
  protected readonly dialogId = `sanring-date-picker-dialog-${nextDialogId++}`;

  protected readonly weekdayLabels = computed(() => {
    const l = this.locale();
    return [...l.weekdayLabels.slice(l.weekStartsOn), ...l.weekdayLabels.slice(0, l.weekStartsOn)];
  });

  constructor() {
    effect(() => this.engine.setLocale(this.locale()));
    effect(() => this.engine.setDisabled(this.disabled()));
    effect(() => this.engine.setAllowDeselect(this.allowDeselect()));

    /**
     * One direction only: external `[(selectedDate)]` writes -> engine (+ input
     * text). The reverse direction (grid click -> model + input text) is handled
     * synchronously by `syncFromEngine()` at its call sites instead of a second
     * effect — two effects that each write what the other reads doesn't converge
     * within a single change-detection tick (Angular schedules the second effect's
     * re-run for the *next* flush), so e.g. a click-then-assert in the same test
     * tick would see stale input text.
     */
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
        this.inputValue.set(modelValue ? this.format().format(modelValue) : '');
        this.invalid.set(false);
      });
    });
  }

  /** Synchronous engine -> model + input text sync for call sites that mutate the engine directly (grid clicks, keyboard selection). */
  private syncFromEngine(): void {
    const value = this.engine.selectedDate();
    if (value !== this.selectedDate()) {
      this.selectedDate.set(value);
    }
    this.inputValue.set(value ? this.format().format(value) : '');
    this.invalid.set(false);
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

  /** Returning focus to the input after a close() (below) fires a native 'focus' event, which would otherwise re-open via onInputFocus(). */
  private suppressNextFocusOpen = false;
  private refocusInputWithoutReopening(): void {
    this.suppressNextFocusOpen = true;
    this.inputElRef.nativeElement.focus();
  }

  protected onInputChange(value: string): void {
    this.inputValue.set(value);
    if (value === '') {
      this.invalid.set(false);
      this.engine.clearSelection();
      this.selectedDate.set(null);
      return;
    }
    const parsed = this.format().parse(value);
    if (parsed === null) {
      this.invalid.set(true);
      return;
    }
    this.invalid.set(false);
    this.engine.setSelectedDate(parsed);
    this.selectedDate.set(parsed);
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
