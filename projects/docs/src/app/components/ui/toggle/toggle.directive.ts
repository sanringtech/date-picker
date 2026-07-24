import { Directive, booleanAttribute, computed, input, model } from '@angular/core';
import { cn } from '../shared/utils';
import { COMPACT_CONTROL_SIZE_CLASSES, CONTROL_TEXT_CLASS } from '../shared/component-styles';
import type { ToggleSize, ToggleVariant } from './toggle.types';

@Directive({
  selector: 'button[sanringToggle]',
  standalone: true,
  host: {
    '[class]': 'toggleClass()',
    '[attr.aria-pressed]': 'pressed()',
    '[attr.data-state]': 'pressed() ? "on" : "off"',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '(click)': 'onClick()',
  },
})
export class ToggleDirective {
  readonly class = input<string | undefined>();
  readonly variant = input<ToggleVariant>('default');
  readonly size = input<ToggleSize>('md');
  readonly pressed = model<boolean>(false);
  readonly disabled = input(false, { transform: booleanAttribute });

  protected onClick(): void {
    if (this.disabled()) return;
    this.pressed.update((v) => !v);
  }

  protected readonly toggleClass = computed(() => {
    const variants: Record<ToggleVariant, string> = {
      default: cn(
        'border-transparent bg-transparent text-[var(--dp-text-main)]',
        'hover:bg-[var(--dp-surface-strong)]',
        'data-[state=on]:bg-[var(--dp-surface-strong)]',
      ),
      outline: cn(
        'border-[var(--dp-border)] bg-transparent text-[var(--dp-text-main)]',
        'hover:bg-[var(--dp-surface-strong)]',
        'data-[state=on]:bg-[var(--dp-surface-strong)]',
      ),
    };
    return cn(
      'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md border',
      CONTROL_TEXT_CLASS,
      'transition-colors focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-[var(--dp-border-strong)]',
      'disabled:pointer-events-none disabled:opacity-50',
      variants[this.variant()],
      COMPACT_CONTROL_SIZE_CLASSES[this.size()],
      this.size() === 'sm' && 'gap-1',
      this.size() === 'md' && 'gap-1.5',
      this.size() === 'lg' && 'gap-2',
      this.class(),
    );
  });
}
