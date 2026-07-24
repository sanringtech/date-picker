import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../shared/utils';

@Component({
  selector: 'sanring-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'cardClass()',
  },
})
export class CardComponent {
  readonly class = input<string | undefined>();

  protected readonly cardClass = computed(() =>
    cn(
      'block rounded-xl border border-[var(--dp-border)] bg-[var(--dp-surface)] text-[var(--dp-text-main)] shadow-sm',
      this.class(),
    ),
  );
}
