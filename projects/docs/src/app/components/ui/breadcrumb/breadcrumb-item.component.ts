import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../shared/utils';

@Component({
  selector: 'sanring-breadcrumb-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'listitem',
    '[class]': 'breadcrumbItemClass()',
  },
  template: `<ng-content></ng-content>`,
})
export class BreadcrumbItemComponent {
  readonly class = input<string | undefined>();

  protected readonly breadcrumbItemClass = computed(() =>
    cn('inline-flex items-center gap-1.5', this.class()),
  );
}
