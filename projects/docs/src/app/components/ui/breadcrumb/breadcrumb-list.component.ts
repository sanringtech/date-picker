import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../shared/utils';
import { BREADCRUMB_TEXT_CLASS } from '../shared/component-styles';

@Component({
  selector: 'sanring-breadcrumb-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'list', // 確保語意
    '[class]': 'breadcrumbListClass()',
  },
  template: `<ng-content></ng-content>`,
})
export class BreadcrumbListComponent {
  readonly class = input<string | undefined>();

  protected readonly breadcrumbListClass = computed(() =>
    cn(
      'flex flex-wrap items-center gap-1.5 break-words text-[var(--dp-text-muted)] sm:gap-2.5',
      BREADCRUMB_TEXT_CLASS,
      this.class(),
    ),
  );
}
