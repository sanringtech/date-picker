import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cn } from '../shared/utils';

@Component({
  selector: 'sanring-breadcrumb-link',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'breadcrumbLinkClass()',
  },
  template: `
    <a [routerLink]="routerLink()" class="transition-colors hover:text-[var(--dp-text-main)]">
      <ng-content></ng-content>
    </a>
  `,
})
export class BreadcrumbLinkComponent {
  readonly class = input<string | undefined>();
  readonly routerLink = input<string | unknown[] | null | undefined>();

  protected readonly breadcrumbLinkClass = computed(() =>
    cn('inline-flex items-center', this.class()),
  );
}
