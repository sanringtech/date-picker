import { Tab as NgTab } from '@angular/aria/tabs';
import { Component, computed, inject, input } from '@angular/core';
import { cn } from '../shared/utils';
import { NAV_ITEM_TEXT_CLASS } from '../shared/component-styles';
import { TabsComponent } from './tabs.component';

@Component({
  selector: 'sanring-tabs-trigger',
  standalone: true,
  template: ` <ng-content></ng-content> `,
  hostDirectives: [
    {
      directive: NgTab,
      inputs: ['value', 'disabled'],
    },
  ],
  host: {
    '[attr.data-state]': "tab.selected() ? 'active' : 'inactive'",
    '[attr.data-disabled]': "tab.disabled() ? '' : null",
    '[class]': 'tabsTriggerClass()',
  },
})
export class TabsTriggerComponent {
  readonly class = input<string | undefined>();

  protected tab = inject(NgTab);
  protected tabs = inject(TabsComponent);
  protected readonly tabsTriggerClass = computed(() => {
    const variant = this.tabs.variant();
    return cn(
      'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dp-bg-base)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      NAV_ITEM_TEXT_CLASS,
      variant === 'default' &&
        'rounded-md border border-transparent px-2.5 py-1 text-[var(--dp-text-muted)] hover:bg-[var(--dp-elevated)] hover:text-[var(--dp-text-main)] data-[state=active]:border-[var(--dp-border-strong)] data-[state=active]:bg-[var(--dp-active)] data-[state=active]:text-[var(--dp-text-main)] data-[state=active]:shadow-sm',
      variant === 'line' &&
        cn(
          'rounded-none border-transparent text-[var(--dp-text-muted)] data-[state=active]:border-[var(--dp-text-main)] data-[state=active]:text-[var(--dp-text-main)]',
          this.tabs.orientation() === 'vertical'
            ? 'justify-start border-l-2 px-3 py-2'
            : 'border-b-2 pb-2.5 pt-2',
        ),
      this.class(),
    );
  });
}
