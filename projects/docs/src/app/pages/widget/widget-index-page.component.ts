import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

@Component({
  selector: 'app-widget-index-page',
  imports: [RouterLink, PageHeaderComponent],
  template: `
    <app-page-header
      title="Widget 層"
      description="Composed 層，Engine 之上提供預設樣式的 Popover DatePicker 元件。"
    />
    <div class="space-y-3">
      <a
        routerLink="/widget/single"
        class="block rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors"
      >
        <p class="font-semibold text-foreground">DatePicker (Single)</p>
        <p class="mt-0.5 text-sm text-muted">單一日期選取，CDK Overlay 錨定的 Popover 日曆</p>
      </a>
      <a
        routerLink="/widget/range"
        class="block rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors"
      >
        <p class="font-semibold text-foreground">DateRangePicker</p>
        <p class="mt-0.5 text-sm text-muted">起訖日期範圍選取</p>
      </a>
    </div>
  `,
})
export class WidgetIndexPageComponent {}
