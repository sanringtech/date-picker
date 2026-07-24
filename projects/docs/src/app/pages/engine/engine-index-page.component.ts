import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-engine-index-page',
  imports: [RouterLink],
  template: `
    <h1 class="mb-2 text-2xl font-bold text-foreground">Engine 層</h1>
    <p class="mb-8 text-muted">
      三個獨立的 Injectable，每個都有自己的狀態機，互不依賴。
    </p>
    <div class="space-y-3">
      <a routerLink="/engine/calendar" class="block rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors">
        <p class="font-semibold text-foreground">CalendarEngine</p>
        <p class="mt-0.5 text-sm text-muted">Single / Range / Multi 日期選取</p>
      </a>
      <a routerLink="/engine/granularity" class="block rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors">
        <p class="font-semibold text-foreground">GranularityPickerEngine</p>
        <p class="mt-0.5 text-sm text-muted">Month / Quarter / Year 粒度選取</p>
      </a>
      <a routerLink="/engine/time" class="block rounded-lg border border-border bg-surface p-4 no-underline hover:border-primary/40 transition-colors">
        <p class="font-semibold text-foreground">TimeAdjustmentEngine</p>
        <p class="mt-0.5 text-sm text-muted">時/分 Draft-Confirm 生命週期</p>
      </a>
    </div>
  `,
})
export class EngineIndexPageComponent {}
