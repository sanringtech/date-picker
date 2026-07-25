import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideChevronRight, LucideDot } from '@lucide/angular';
import { cn } from '../shared/utils';
import { BREADCRUMB_SEPARATOR_ICON_CLASS } from '../shared/component-styles';
import { BreadcrumbDividerType } from './breadcrumb.type';

@Component({
  selector: 'sanring-breadcrumb-divider',
  standalone: true,
  imports: [LucideChevronRight, LucideDot],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'presentation',
    'aria-hidden': 'true',
    '[class]': 'breadcrumbDividerClass()',
  },
  /**
   * ng-content fallback（Angular 18+）：
   * - 使用者有投入內容 → 顯示自訂內容，fallback 不渲染
   * - 使用者未投入內容 → 顯示 fallback（依 type 決定圖示）
   *
   * 自訂分隔符號：
   *   <sanring-breadcrumb-divider>
   *     <span aria-hidden="true">/</span>
   *   </sanring-breadcrumb-divider>
   */
  template: `
    <ng-content>
      @if (type() === 'dot') {
        <svg lucideDot [class]="separatorIconClass"></svg>
      } @else {
        <svg lucideChevronRight [class]="separatorIconClass"></svg>
      }
    </ng-content>
  `,
})
export class BreadcrumbDividerComponent {
  protected readonly separatorIconClass = BREADCRUMB_SEPARATOR_ICON_CLASS;

  /** 預設圖示類型：`'chevron'`（預設，>）或 `'dot'`（·）*/
  readonly type = input<BreadcrumbDividerType>('chevron');

  readonly class = input<string | undefined>();

  protected readonly breadcrumbDividerClass = computed(() =>
    cn('flex items-center justify-center text-[var(--dp-text-muted)]', this.class()),
  );
}
