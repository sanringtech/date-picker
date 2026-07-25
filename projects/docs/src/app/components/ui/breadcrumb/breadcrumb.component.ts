import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../shared/utils';

@Component({
  selector: 'sanring-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'navigation',
    'aria-label': 'breadcrumb',
    '[class]': 'breadcrumbClass()',
  },
  template: `<ng-content></ng-content>`,
})
export class BreadcrumbComponent {
  readonly class = input<string | undefined>();

  protected readonly breadcrumbClass = computed(() => cn('block', this.class()));
}
