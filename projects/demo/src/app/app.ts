import { Component, effect, inject, signal, viewChildren } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import { CALENDAR_LOCALE, CalendarGridDirective } from '@sanring/date-picker';
import type {
  CalendarDay,
  CalendarEngine,
  DateInterval,
  PickerGranularity,
} from '@sanring/date-picker';
import { ButtonDirective } from './components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from './components/ui/card';
import { GranularityPickerDemoComponent } from './granularity-picker-demo.component';
import { DrillDownPickerDemoComponent } from './drilldown-picker-demo.component';
import { TimeAdjustmentDemoComponent } from './time-adjustment-demo.component';
import { FIXED_TODAY } from './app.config';

/** R4 / Decision 5: an OR-combined disabled matcher — weekends (predicate) + a fixed holiday block (DateInterval). */
const isWeekend = (date: Date): boolean => date.getDay() === 0 || date.getDay() === 6;
const summerBreak: DateInterval = { from: new Date(2026, 6, 20), to: new Date(2026, 6, 24) };

interface DemoScenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly configure: (engine: CalendarEngine) => void;
  /** Number of parallel months rendered — used to widen the card layout. */
  readonly monthsToDisplay?: number;
}

/**
 * Progressive showcase states (PRD §8's "representative assembly states"
 * spirit, scoped to what M1–M3 actually implement). Each scenario gets its
 * own CalendarEngine instance — CalendarGridDirective is component-scoped
 * by design, so N grids on one page never share state.
 */
const SCENARIOS: readonly DemoScenario[] = [
  {
    id: 'basic',
    title: '① 基礎單選',
    description: '預設狀態：任選一天，再點同一天可取消選取。沒有任何禁用規則。',
    configure: () => undefined,
  },
  {
    id: 'no-deselect',
    title: '② 不可取消選取',
    description: 'allowDeselect = false — 再次點擊已選日期不會取消（憲法 §4 的另一個合法分支）。',
    configure: (engine) => engine.setAllowDeselect(false),
  },
  {
    id: 'disabled',
    title: '③ 含禁用規則（最完整）',
    description:
      '週末（自訂函式）＋ 7/20–7/24 公休（DateInterval）疊加禁用（R4 / Decision 5），且不可取消選取。',
    configure: (engine) => {
      engine.setAllowDeselect(false);
      engine.setDisabled([isWeekend, summerBreak]);
    },
  },
  {
    id: 'range',
    title: '④ 區間選取（Range）',
    description:
      '第一次點擊設定起點（進入 Draft），第二次點擊提交區間，Escape 或「中止草稿」按鈕中止並回溯（Decision 3 / §4）。',
    configure: (engine) => engine.setSelectionMode('range'),
  },
  {
    id: 'multimonth',
    title: '⑤ 多月並排 + 跨月焦點（M4）',
    description:
      '同時顯示兩個月份（Decision 8），鍵盤方向鍵在兩個月格之間無縫移動；抵達整個視窗邊界才自動換頁（Decision 6）。',
    configure: (engine) => {
      engine.setSelectionMode('range');
      engine.setMonthsToDisplay(2);
    },
    monthsToDisplay: 2,
  },
  {
    id: 'multi',
    title: '⑥ 多選日期（Multi-dates，M6）',
    description:
      '累積點選任意不連續日期，再次點擊同一天立即移除（toggle 語意，不受 allowDeselect 影響，Decision 11 / I6）；下方標籤可用 removeDate() 個別移除，或用「清空」整批歸零。',
    configure: (engine) => engine.setSelectionMode('multi'),
  },
];

interface GranularityDemoScenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly granularity: PickerGranularity;
  readonly mode: 'single' | 'range' | 'multi';
}

/**
 * M7 / ADR-0001 assembly examples — GranularityPickerEngine, a sibling engine
 * to CalendarEngine, so each card here provides its own instance directly
 * rather than going through CalendarGridDirective (see
 * granularity-picker-demo.component.ts).
 */
const GRANULARITY_SCENARIOS: readonly GranularityDemoScenario[] = [
  {
    id: 'month-picker',
    title: '⑦ 月份選取（Month-picker，M7）',
    description: '12 格月網格，單選模式，語意與日網格的 single 完全對稱（Decision 12）。',
    granularity: 'month',
    mode: 'single',
  },
  {
    id: 'quarter-picker',
    title: '⑧ 季度區間選取（Quarter-picker，M7）',
    description:
      '4 格季網格，財年起始月注入為 4 月（CALENDAR_QUARTER_STARTS_ON = 3，非公曆 1 月起算），示範 Story 11 財年 vs 公曆季度歧義；區間模式：先選起點再選終點。',
    granularity: 'quarter',
    mode: 'range',
  },
  {
    id: 'year-picker',
    title: '⑨ 年份多選（Year-picker，M7）',
    description: 'N 格年網格（滑動視窗，比照 Decision 8），多選模式累積不連續年份。',
    granularity: 'year',
    mode: 'multi',
  },
];

@Component({
  selector: 'app-root',
  imports: [
    CalendarGridDirective,
    ButtonDirective,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX,
    GranularityPickerDemoComponent,
    DrillDownPickerDemoComponent,
    TimeAdjustmentDemoComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly locale = inject(CALENDAR_LOCALE);
  private readonly grids = viewChildren(CalendarGridDirective);

  protected readonly scenarios = SCENARIOS;
  protected readonly granularityScenarios = GRANULARITY_SCENARIOS;
  protected readonly fixedToday = FIXED_TODAY;
  /** Controls whether the selection info renders as a separate block below the calendar. */
  protected readonly showInfoBlock = signal(true);

  protected readonly weekdayLabels = [
    ...this.locale.weekdayLabels.slice(this.locale.weekStartsOn),
    ...this.locale.weekdayLabels.slice(0, this.locale.weekStartsOn),
  ];

  constructor() {
    effect(() => {
      this.grids().forEach((directive, index) => {
        SCENARIOS[index]?.configure(directive.engine);
      });
    });
  }

  protected currentMonthLabel(days: readonly CalendarDay[]): string {
    const current = days.find((day) => day.isCurrentMonth) ?? days[0];
    return `${current.date.getFullYear()} ${this.locale.monthLabels[current.date.getMonth()]}`;
  }

  /** Splits a flat 42-cell grid into 6 week rows for role=row ARIA wrappers. */
  protected toWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) {
      weeks.push(grid.slice(i, i + 7) as CalendarDay[]);
    }
    return weeks;
  }

  protected ariaLabel(day: CalendarDay): string {
    const base = format(day.date, 'yyyy-MM-dd');
    if (day.isDisabled) return `${base}（不可選）`;
    if (day.isRangeStart) return `${base}（區間起點）`;
    if (day.isRangeEnd) return `${base}（區間終點）`;
    return base;
  }

  protected dayTestId(scenarioId: string, date: Date): string {
    return `${scenarioId}-${format(date, 'yyyy-MM-dd')}`;
  }

  protected formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  protected formatDates(dates: Date[]): string {
    if (dates.length === 0) return '';
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const labels = sorted.slice(0, 3).map((d) => format(d, 'MM/dd'));
    return sorted.length > 3 ? `${labels.join('、')}…` : labels.join('、');
  }

  protected toggleTheme(): void {
    const root = document.documentElement;
    if (root.dataset['theme'] === 'light') {
      delete root.dataset['theme'];
    } else {
      root.dataset['theme'] = 'light';
    }
  }
}
