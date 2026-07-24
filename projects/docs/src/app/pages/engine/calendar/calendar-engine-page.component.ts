import { Component } from '@angular/core';

@Component({
  selector: 'app-calendar-engine-page',
  template: `
    <h1 class="mb-2 text-2xl font-bold text-foreground">CalendarEngine</h1>
    <p class="mb-1 text-sm text-muted">M1–M6 &nbsp;·&nbsp; <code class="font-mono text-xs">CalendarGridDirective</code></p>
    <p class="mb-8 text-muted">
      Single / Range / Multi 三種選取模式的核心狀態機，42-cell 固定月網格，鍵盤導航與 Disabled Dates。
    </p>

    <div class="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-muted">
      Demo 即將加入
    </div>
  `,
})
export class CalendarEnginePageComponent {}
