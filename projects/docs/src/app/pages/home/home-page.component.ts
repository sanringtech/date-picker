import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-5xl px-6 py-20">
      <div class="max-w-2xl">
        <p class="mb-3 text-sm font-semibold text-primary">@sanring/date-picker</p>
        <h1 class="mb-4 text-4xl font-bold text-foreground">
          Headless Angular<br />Calendar Engine
        </h1>
        <p class="mb-8 text-lg text-muted leading-relaxed">
          純狀態機層，零 UI 耦合。負責日期運算、選取規則、鍵盤導航，
          讓你完全自訂外觀，不被任何設計框架綁死。
        </p>

        <div class="flex gap-3">
          <a
            routerLink="/engine/calendar"
            class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90"
          >
            開始使用 Engine
          </a>
          <a
            routerLink="/engine"
            class="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-surface"
          >
            Engine 總覽
          </a>
        </div>
      </div>

      <!-- Architecture overview -->
      <div class="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <a
          routerLink="/engine/calendar"
          class="group rounded-xl border border-border bg-surface p-5 no-underline transition-colors hover:border-primary/40"
        >
          <p class="mb-1 font-semibold text-foreground">CalendarEngine</p>
          <p class="text-sm text-muted">
            Single / Range / Multi 日期選取，42-cell 網格，鍵盤導航，Disabled Dates
          </p>
          <p class="mt-3 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
            M1–M6 →
          </p>
        </a>
        <a
          routerLink="/engine/granularity"
          class="group rounded-xl border border-border bg-surface p-5 no-underline transition-colors hover:border-primary/40"
        >
          <p class="mb-1 font-semibold text-foreground">GranularityPickerEngine</p>
          <p class="text-sm text-muted">
            Month / Quarter / Year 粒度選取，財年起始月可注入，與 CalendarEngine 完全平行
          </p>
          <p class="mt-3 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
            M7 →
          </p>
        </a>
        <a
          routerLink="/engine/time"
          class="group rounded-xl border border-border bg-surface p-5 no-underline transition-colors hover:border-primary/40"
        >
          <p class="mb-1 font-semibold text-foreground">TimeAdjustmentEngine</p>
          <p class="text-sm text-muted">
            時/分 Draft-Confirm 生命週期，caller-key 設計，TimePrecision 可配置
          </p>
          <p class="mt-3 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
            M8 →
          </p>
        </a>
      </div>
    </div>
  `,
})
export class HomePageComponent {}
