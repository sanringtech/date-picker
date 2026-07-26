import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../components/ui/button';
import { SANRING_UI_LINKS } from '../../navigation/external-links';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ButtonDirective],
  template: `
    <div class="mx-auto max-w-[var(--dp-content-max-w)] px-6 py-20">
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
            sanringBtn
            variant="default"
            size="md"
            routerLink="/engine/calendar"
            class="no-underline"
          >
            開始使用 Engine
          </a>
          <a sanringBtn variant="outline" size="md" routerLink="/engine" class="no-underline">
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

      <!-- Widget layer -->
      <div class="mt-16">
        <h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Widget 層</h2>
        <p class="mb-4 text-sm text-muted">
          Composed 層，Engine 之上提供預設樣式的 Popover DatePicker 元件。
        </p>
        <a
          routerLink="/widget"
          class="flex items-center justify-between rounded-xl border border-dashed border-border bg-surface p-5 no-underline transition-colors hover:border-primary/40"
        >
          <span>
            <span class="font-semibold text-foreground">@sanring/date-picker-widget</span>
            <p class="mt-1 text-sm text-muted">在 Engine 之上組合的預設樣式元件</p>
          </span>
        </a>
      </div>

      <!-- Styled components -->
      <div class="mt-10">
        <h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          樣式化元件（@sanring/ui）
        </h2>
        <p class="mb-4 text-sm text-muted">
          想要現成樣式、不走 headless？@sanring/ui 提供對應的樣式化元件。
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            [href]="uiLinks.calendar"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-between rounded-lg border border-border bg-surface p-4 no-underline transition-colors hover:border-primary/40"
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
            class="flex items-center justify-between rounded-lg border border-border bg-surface p-4 no-underline transition-colors hover:border-primary/40"
          >
            <span>
              <p class="font-semibold text-foreground">Date Picker</p>
              <p class="mt-0.5 text-sm text-muted">ui.sanring.dev/components/date-picker</p>
            </span>
            <span class="text-muted" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class HomePageComponent {
  protected readonly uiLinks = SANRING_UI_LINKS;
}
