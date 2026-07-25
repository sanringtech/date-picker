import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SANRING_UI_LINKS } from '../../navigation/external-links';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

@Component({
  selector: 'app-engine-index-page',
  imports: [RouterLink, PageHeaderComponent],
  template: `
    <app-page-header
      title="Engine 層"
      description="三個獨立的 Injectable，每個都有自己的狀態機，互不依賴。"
    />
    <div class="space-y-3">
      <a
        routerLink="/engine/calendar"
        class="block rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors"
      >
        <p class="font-semibold text-foreground">CalendarEngine</p>
        <p class="mt-0.5 text-sm text-muted">Single / Range / Multi 日期選取</p>
      </a>
      <a
        routerLink="/engine/granularity"
        class="block rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors"
      >
        <p class="font-semibold text-foreground">GranularityPickerEngine</p>
        <p class="mt-0.5 text-sm text-muted">Month / Quarter / Year 粒度選取</p>
      </a>
      <a
        routerLink="/engine/time"
        class="block rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors"
      >
        <p class="font-semibold text-foreground">TimeAdjustmentEngine</p>
        <p class="mt-0.5 text-sm text-muted">時/分 Draft-Confirm 生命週期</p>
      </a>
    </div>

    <h2 class="mb-2 mt-10 text-sm font-semibold uppercase tracking-wider text-muted">
      樣式化元件（@sanring/ui）
    </h2>
    <p class="mb-4 text-sm text-muted">
      這些 Engine 背後對應的預設樣式元件，託管在 @sanring/ui 的文件站。
    </p>
    <div class="space-y-3">
      <a
        [href]="uiLinks.calendar"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-between rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors"
      >
        <span>
          <p class="font-semibold text-foreground">Calendar</p>
          <p class="mt-0.5 text-sm text-muted">ui.sanring.dev/components/calendar</p>
        </span>
        <span class="text-muted" aria-hidden="true">↗</span>
      </a>
      <a
        [href]="uiLinks.datePicker"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-between rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors"
      >
        <span>
          <p class="font-semibold text-foreground">Date Picker</p>
          <p class="mt-0.5 text-sm text-muted">ui.sanring.dev/components/date-picker</p>
        </span>
        <span class="text-muted" aria-hidden="true">↗</span>
      </a>
    </div>
  `,
})
export class EngineIndexPageComponent {
  protected readonly uiLinks = SANRING_UI_LINKS;
}
