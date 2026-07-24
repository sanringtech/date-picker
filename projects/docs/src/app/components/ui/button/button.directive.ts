import {
  Directive,
  ElementRef,
  HostListener,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { cn } from '../shared/utils';
import { CONTROL_SIZE_CLASSES, CONTROL_TEXT_CLASS } from '../shared/component-styles';
import type { ButtonSize, ButtonVariant } from './button.types';

@Directive({
  selector: 'button[sanringBtn], a[sanringBtn]',
  standalone: true,
  host: {
    '[class]': 'buttonClass()',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '[attr.disabled]': 'disabled() && !isAnchor ? true : null',
    '[attr.tabindex]': 'disabled() && isAnchor ? -1 : null',
  },
})
export class ButtonDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly class = input<string | undefined>();
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly isAnchor = this.elementRef.nativeElement.tagName.toLowerCase() === 'a';

  protected readonly buttonClass = computed(() => {
    const variants: Record<ButtonVariant, string> = {
      default:
        'border-transparent bg-[var(--dp-control)] text-[var(--dp-control-foreground)] hover:brightness-95 active:brightness-90',
      secondary:
        'border-[var(--dp-border)] bg-[var(--dp-surface-strong)] text-[var(--dp-text-main)] hover:bg-[var(--dp-active)] active:brightness-90',
      outline:
        'border-[var(--dp-border-strong)] bg-transparent text-[var(--dp-text-main)] hover:bg-[var(--dp-surface-strong)] active:brightness-90',
      ghost:
        'border-transparent bg-transparent text-[var(--dp-text-main)] hover:bg-[var(--dp-surface-strong)] active:brightness-90',
      destructive:
        'border-transparent bg-[var(--dp-danger)] text-white hover:bg-[var(--dp-danger-strong)] focus-visible:ring-[var(--dp-danger)] active:brightness-90',
      link: 'border-transparent bg-transparent px-0 text-[var(--dp-text-main)] underline-offset-4 hover:underline active:opacity-70',
    };
    return cn(
      'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border',
      CONTROL_TEXT_CLASS,
      'transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-[var(--dp-border-strong)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
      variants[this.variant()],
      CONTROL_SIZE_CLASSES[this.size()],
      this.class(),
    );
  });

  @HostListener('click', ['$event'])
  protected handleClick(event: Event) {
    if (!this.disabled()) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
