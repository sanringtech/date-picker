import {
  AfterContentInit,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { TabList as NgTabList } from '@angular/aria/tabs';
import { cn } from '../shared/utils';
import { TabsComponent } from './tabs.component';

@Component({
  selector: 'sanring-tabs-list',
  standalone: true,
  template: `<ng-content></ng-content>`,
  hostDirectives: [
    {
      directive: NgTabList,
      inputs: ['orientation', 'selectionMode', 'wrap', 'softDisabled', 'focusMode', 'disabled'],
    },
  ],
  host: {
    '[class]': 'tabsListClass()',
  },
})
export class TabsListComponent implements AfterContentInit {
  readonly class = input<string | undefined>();

  protected tabs = inject(TabsComponent);
  private tabList = inject(NgTabList);
  protected readonly tabsListClass = computed(() => {
    const variant = this.tabs.variant();

    return cn(
      this.tabs.orientation() === 'vertical'
        ? 'inline-grid w-max items-stretch'
        : 'inline-flex w-max items-center justify-center',
      variant === 'default' &&
        'rounded-lg border border-[var(--dp-border)] bg-[var(--dp-surface-strong)] p-0.5 text-[var(--dp-text-muted)] shadow-sm',
      variant === 'line' &&
        (this.tabs.orientation() === 'vertical'
          ? 'border-l border-[var(--dp-border)] bg-transparent p-0'
          : 'justify-start border-b border-[var(--dp-border)] bg-transparent p-0'),
      this.class(),
    );
  });

  constructor() {
    // 只訂閱 NgTabList 的選取變動；讀 tabs.value() 用 untracked 避免 value 變動再次觸發
    effect(() => {
      const selectedTab = this.tabList.selectedTab();
      if (selectedTab && selectedTab !== untracked(() => this.tabs.value())) {
        this.tabs.setValue(selectedTab);
      }
    });
  }

  ngAfterContentInit() {
    const value = this.tabs.value();

    if (value) {
      this.tabList.selectedTab.set(value);
    }
  }
}
