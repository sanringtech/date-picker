import { Component, effect, inject, viewChildren } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { CALENDAR_LOCALE, CalendarGridDirective } from '@sanring/date-picker';
import type { CalendarDay, CalendarEngine, DateInterval } from '@sanring/date-picker';
import { ButtonDirective } from './components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from './components/ui/card';
import { FIXED_TODAY } from './app.config';

/** R4 / Decision 5: an OR-combined disabled matcher — weekends (predicate) + a fixed holiday block (DateInterval). */
const isWeekend = (date: Date): boolean => date.getDay() === 0 || date.getDay() === 6;
const summerBreak: DateInterval = { from: new Date(2026, 6, 20), to: new Date(2026, 6, 24) };

interface DemoScenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly configure: (engine: CalendarEngine) => void;
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
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly locale = inject(CALENDAR_LOCALE);
  private readonly grids = viewChildren(CalendarGridDirective);

  protected readonly scenarios = SCENARIOS;
  protected readonly fixedToday = FIXED_TODAY;

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

  protected dayTestId(scenarioId: string, date: Date): string {
    return `${scenarioId}-${format(date, 'yyyy-MM-dd')}`;
  }

  protected formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
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
