import { Component } from '@angular/core';

@Component({
  selector: 'app-granularity-engine-page',
  template: `
    <h1 class="mb-2 text-2xl font-bold text-foreground">GranularityPickerEngine</h1>
    <p class="mb-1 text-sm text-muted">M7 &nbsp;·&nbsp; <code class="font-mono text-xs">GranularityGridDirective</code></p>
    <p class="mb-8 text-muted">
      Month / Quarter / Year 粒度選取，與 CalendarEngine 共用同一套 Single/Range/Multi 語意，財年起始月可注入。
    </p>

    <div class="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-muted">
      Demo 即將加入
    </div>
  `,
})
export class GranularityEnginePageComponent {}
