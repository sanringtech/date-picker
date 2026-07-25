import { Directive, inject } from '@angular/core';
import { CollapsibleComponent } from './collapsible.component';

@Directive({
  selector: '[sanringCollapsibleContent]',
  standalone: true,
  host: {
    '[id]': 'collapsible.contentId',
    '[hidden]': '!collapsible.open()',
    role: 'region',
    '[attr.aria-labelledby]': 'collapsible.triggerId',
  },
})
export class CollapsibleContentDirective {
  protected readonly collapsible = inject(CollapsibleComponent);
}
