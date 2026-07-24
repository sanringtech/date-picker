import { Component } from '@angular/core';

@Component({
  selector: 'app-widget-page',
  template: `
    <h1 class="mb-2 text-2xl font-bold text-foreground">Widget Layer</h1>
    <p class="mb-8 text-muted">
      Composed Widget 層（<code class="font-mono text-xs">@sanring/date-picker-widget</code>）： 在
      Engine 之上提供預設樣式的 Popover DatePicker 元件。
    </p>

    <div class="rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p class="text-sm font-medium text-foreground">Coming Soon</p>
      <p class="mt-1 text-sm text-muted">Widget 層規劃在 Engine 層完成後開始實作。</p>
    </div>
  `,
})
export class WidgetPageComponent {}
