import {
  booleanAttribute,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  ViewChild,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl, Validators } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { cn } from '../shared/utils';
import {
  SELECTION_CONTROL_FOCUS_CLASS,
  SWITCH_THUMB_SIZE_CLASSES,
  SWITCH_THUMB_TRANSLATE_CLASSES,
  SWITCH_TRACK_SIZE_CLASSES,
} from '../shared/component-styles';
import { FieldType, SanringFieldControl, SANRING_FIELD_CONTROL } from '../field/field.type';
import { SwitchSize } from './switch.type';

let nextUniqueId = 0;

@Component({
  selector: 'sanring-switch',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SwitchComponent),
      multi: true,
    },
    // 跟 checkbox 一樣：id/disabled 已經被同名 @Input 佔用，改用 useFactory 轉接。
    {
      provide: SANRING_FIELD_CONTROL,
      useFactory: (host: SwitchComponent) => new SwitchFieldControlAdapter(host),
      deps: [forwardRef(() => SwitchComponent)],
    },
  ],
  template: `
    <button
      #btn
      type="button"
      role="switch"
      [id]="id()"
      [attr.aria-checked]="checkedSignal()"
      [attr.aria-invalid]="invalid() || errorState ? 'true' : null"
      [attr.aria-required]="fieldRequired ? 'true' : null"
      [attr.aria-describedby]="computedAriaDescribedBy()"
      [attr.data-state]="checkedSignal() ? 'checked' : 'unchecked'"
      [disabled]="isDisabled()"
      [class]="trackClass()"
      (click)="toggle()"
      (focus)="onFocus()"
      (blur)="onBlur()"
    >
      <span [attr.data-state]="checkedSignal() ? 'checked' : 'unchecked'" [class]="thumbClass()">
        <span
          class="pointer-events-none absolute inset-0 grid place-items-center text-[var(--dp-text-main)]"
          [class.hidden]="!checkedSignal()"
        >
          <ng-content select="[sanringSwitchIconChecked]" />
        </span>
        <span
          class="pointer-events-none absolute inset-0 grid place-items-center text-[var(--dp-text-main)]"
          [class.hidden]="checkedSignal()"
        >
          <ng-content select="[sanringSwitchIconUnchecked]" />
        </span>
      </span>
    </button>
  `,
})
export class SwitchComponent implements ControlValueAccessor, OnInit {
  readonly class = input<string | undefined>();
  readonly id = input(`sanring-switch-${nextUniqueId++}`);
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly size = input<SwitchSize>('md');

  protected readonly checkedSignal = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledState());
  protected readonly trackClass = computed(() =>
    cn(
      'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      SELECTION_CONTROL_FOCUS_CLASS,
      SWITCH_TRACK_SIZE_CLASSES[this.size()],
      this.invalid() || this.errorState ? 'border-red-500' : 'border-transparent',
      this.checkedSignal() ? 'bg-[var(--dp-text-main)]' : 'bg-[var(--dp-border-strong)]',
      this.class(),
    ),
  );
  protected readonly thumbClass = computed(() =>
    cn(
      'pointer-events-none relative block rounded-full bg-[var(--dp-bg-base)] shadow-lg ring-0 transition-transform duration-200 ease-in-out',
      SWITCH_THUMB_SIZE_CLASSES[this.size()],
      this.checkedSignal() && SWITCH_THUMB_TRANSLATE_CLASSES[this.size()],
      !this.checkedSignal() && 'translate-x-0',
    ),
  );

  private readonly disabledState = signal(false);
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- CVA no-op placeholders, replaced by register*() below
  private onChange: (value: boolean) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  // ==========================================
  // Field 整合：id/disabled 已經被同名 @Input 佔用，走下面的 fieldXxx getter，
  // 由 SwitchFieldControlAdapter 轉接成 SanringFieldControl 介面。
  // ==========================================
  readonly controlType = FieldType.switch;
  focused = false;
  ngControl: NgControl | null = null;

  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('btn') private btnRef!: ElementRef<HTMLButtonElement>;

  private readonly stateChangesSubject = new Subject<void>();
  readonly stateChanges: Observable<void> = this.stateChangesSubject.asObservable();
  private readonly stateVersion = signal(0);
  private readonly fieldDescribedByIds = signal<string[]>([]);

  protected readonly computedAriaDescribedBy = computed(() => {
    const ids = [...this.fieldDescribedByIds()].filter((v): v is string => !!v);
    return ids.length ? ids.join(' ') : undefined;
  });

  get errorState(): boolean {
    this.stateVersion();
    return !!(this.ngControl?.invalid && this.ngControl?.touched);
  }

  get fieldValue(): boolean {
    return this.checkedSignal();
  }

  get fieldEmpty(): boolean {
    return !this.checkedSignal();
  }

  get fieldDisabled(): boolean {
    return this.isDisabled();
  }

  get fieldRequired(): boolean {
    this.stateVersion();
    return !!this.ngControl?.control?.hasValidator(Validators.required);
  }

  constructor() {
    effect(() => {
      this.checkedSignal.set(this.checked());
    });

    this.destroyRef.onDestroy(() => this.stateChangesSubject.complete());
  }

  ngOnInit(): void {
    // 跟 checkbox 一樣的原因：constructor 階段 self-inject NgControl 會跟 NgModel 搭配時
    // 觸發 NG0200 循環依賴（本元件同時透過 NG_VALUE_ACCESSOR 註冊自己），延後到 ngOnInit 才拿。
    this.ngControl = this.injector.get(NgControl, null, { optional: true, self: true });
    // 不能只聽 statusChanges——markAsTouched() 不會觸發它，改聽 control.events（Angular
    // v18+ 公開 API）才能在 markAllAsTouched() 這類外部呼叫時正確更新 errorState。
    this.ngControl?.control?.events
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitStateChanges());
  }

  toggle() {
    if (this.isDisabled()) return;
    this.checkedSignal.set(!this.checkedSignal());
    this.onChange(this.checkedSignal());
    this.onTouched();
    this.emitStateChanges();
  }

  onFocus() {
    this.focused = true;
    this.emitStateChanges();
  }

  onBlur() {
    this.focused = false;
    this.onTouched();
    this.emitStateChanges();
  }

  focus(options?: FocusOptions): void {
    this.btnRef?.nativeElement.focus(options);
  }

  setDescribedByIds(ids: string[]): void {
    this.fieldDescribedByIds.set(ids);
  }

  writeValue(value: boolean | null | undefined): void {
    this.checkedSignal.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
    this.emitStateChanges();
  }

  private emitStateChanges(): void {
    this.stateVersion.update((v) => v + 1);
    this.stateChangesSubject.next();
  }
}

class SwitchFieldControlAdapter implements SanringFieldControl<boolean> {
  readonly controlType = FieldType.switch;

  constructor(private readonly host: SwitchComponent) {}

  get id(): string {
    return this.host.id();
  }

  get value(): boolean {
    return this.host.fieldValue;
  }

  get empty(): boolean {
    return this.host.fieldEmpty;
  }

  get focused(): boolean {
    return this.host.focused;
  }

  get errorState(): boolean {
    return this.host.errorState;
  }

  get disabled(): boolean {
    return this.host.fieldDisabled;
  }

  get required(): boolean {
    return this.host.fieldRequired;
  }

  get ngControl(): NgControl | null {
    return this.host.ngControl;
  }

  get stateChanges(): Observable<void> {
    return this.host.stateChanges;
  }

  focus(options?: FocusOptions): void {
    this.host.focus(options);
  }

  setDescribedByIds(ids: string[]): void {
    this.host.setDescribedByIds(ids);
  }
}
