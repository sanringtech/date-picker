import { Component } from '@angular/core';

@Component({
  selector: 'app-time-engine-page',
  template: `
    <h1 class="mb-2 text-2xl font-bold text-foreground">TimeAdjustmentEngine</h1>
    <p class="mb-1 text-sm text-muted">M8 &nbsp;·&nbsp; <code class="font-mono text-xs">&#64;Injectable()</code></p>
    <p class="mb-8 text-muted">
      時/分 Draft–Confirm 生命週期，完全不認識 CalendarEngine。caller-key 設計讓 Single/Range/Multi 各自獨立管理。
    </p>

    <div class="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-muted">
      Demo 即將加入
    </div>
  `,
})
export class TimeEnginePageComponent {}
