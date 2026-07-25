import { TabContent as NgTabContent, TabPanel as NgTabPanel } from '@angular/aria/tabs';
import { Component, computed, inject, input } from '@angular/core';
import { cn } from '../shared/utils';

@Component({
  selector: 'sanring-tabs-content',
  standalone: true,
  imports: [NgTabContent], // NgTabPanel 僅用於 hostDirectives，不需加入 imports
  template: `
    <ng-template ngTabContent>
      <ng-content></ng-content>
    </ng-template>
  `,
  hostDirectives: [
    {
      directive: NgTabPanel,
      inputs: ['value'],
    },
  ],
  host: {
    '[hidden]': '!panel.visible()',
    '[attr.data-state]': "panel.visible() ? 'active' : 'inactive'",
    '[class]': 'tabsContentClass()',
  },
})
export class TabsContentComponent {
  readonly class = input<string | undefined>();

  protected panel = inject(NgTabPanel);
  protected readonly tabsContentClass = computed(() =>
    cn(
      'block min-w-0 mt-2 ring-offset-[var(--dp-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-border-strong)] focus-visible:ring-offset-2',
      this.class(),
    ),
  );
}
