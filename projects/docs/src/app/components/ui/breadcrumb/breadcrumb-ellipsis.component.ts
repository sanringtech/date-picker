import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideEllipsis } from '@lucide/angular';
import { cn } from '../shared/utils';
import { BREADCRUMB_ICON_SIZE_CLASS } from '../shared/component-styles';

@Component({
  selector: 'sanring-breadcrumb-ellipsis',
  standalone: true,
  imports: [LucideEllipsis],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'presentation',
    'aria-hidden': 'true',
    '[class]': 'breadcrumbEllipsisClass()',
  },
  template: `
    <ng-content>
      <svg lucideEllipsis class="size-4"></svg>
    </ng-content>
    <span class="sr-only">More links</span>
  `,
})
export class BreadcrumbEllipsisComponent {
  readonly class = input<string | undefined>();

  protected readonly breadcrumbEllipsisClass = computed(() =>
    cn('flex items-center justify-center', BREADCRUMB_ICON_SIZE_CLASS, this.class()),
  );
}
