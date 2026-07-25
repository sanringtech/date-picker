import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  model,
} from '@angular/core';
import { cn } from '../shared/utils';

let _nextId = 0;

@Component({
  selector: 'sanring-collapsible',
  standalone: true,
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class CollapsibleComponent {
  readonly class = input<string | undefined>();
  readonly open = model<boolean>(false);
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly _id = ++_nextId;
  readonly contentId = `sanring-collapsible-${this._id}-content`;
  readonly triggerId = `sanring-collapsible-${this._id}-trigger`;

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((v) => !v);
  }

  protected readonly hostClass = computed(() => cn(this.class()));
}
