import { Component, effect, inject, signal, viewChildren } from '@angular/core';
import { format } from 'date-fns/format';
import { LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import {
  CALENDAR_LOCALE,
  CalendarEngine,
  CalendarGridDirective,
  GranularityPickerEngine,
} from '@sanring/date-picker';
import type { CalendarDay, DateInterval, GranularityCell } from '@sanring/date-picker';
import { ButtonDirective } from '../../../components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from '../../../components/ui/card';

const isWeekend = (date: Date): boolean => date.getDay() === 0 || date.getDay() === 6;
const summerBreak: DateInterval = { from: new Date(2026, 6, 20), to: new Date(2026, 6, 24) };

interface Scenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly configure: (engine: CalendarEngine) => void;
  readonly monthsToDisplay?: number;
}

const SCENARIOS: readonly Scenario[] = [
  {
    id: 'basic',
    title: '基礎單選',
    description: '預設狀態：任選一天，再點同一天可取消選取。沒有任何禁用規則。',
    configure: () => undefined,
  },
  {
    id: 'no-deselect',
    title: '不可取消選取',
    description: 'allowDeselect = false — 再次點擊已選日期不會取消（憲法 §4 的另一個合法分支）。',
    configure: (e) => e.setAllowDeselect(false),
  },
  {
    id: 'disabled',
    title: '含禁用規則',
    description: '週末（自訂函式）＋ 7/20–7/24 公休（DateInterval）疊加禁用，且不可取消選取。',
    configure: (e) => {
      e.setAllowDeselect(false);
      e.setDisabled([isWeekend, summerBreak]);
    },
  },
  {
    id: 'range',
    title: '區間選取（Range）',
    description:
      '第一次點擊設定起點（進入 Draft），第二次點擊提交區間，Escape 或「中止」按鈕中止並回溯。',
    configure: (e) => e.setSelectionMode('range'),
  },
  {
    id: 'multimonth',
    title: '多月並排（M4）',
    description: '同時顯示兩個月份，鍵盤方向鍵在兩個月格之間無縫移動；抵達整個視窗邊界才自動換頁。',
    configure: (e) => {
      e.setSelectionMode('range');
      e.setMonthsToDisplay(2);
    },
    monthsToDisplay: 2,
  },
  {
    id: 'multi',
    title: '多選日期（Multi，M6）',
    description:
      '累積點選任意不連續日期，再次點擊同一天立即移除（toggle 語意）；標籤可個別移除，或「清空」整批歸零。',
    configure: (e) => e.setSelectionMode('multi'),
  },
];

type DrillViewMode = 'day' | 'month' | 'year';

@Component({
  selector: 'app-calendar-engine-page',
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
  ],
  providers: [CalendarEngine, GranularityPickerEngine],
  templateUrl: './calendar-engine-page.component.html',
})
export class CalendarEnginePageComponent {
  private readonly locale = inject(CALENDAR_LOCALE);
  private readonly grids = viewChildren(CalendarGridDirective);

  protected readonly scenarios = SCENARIOS;
  protected readonly weekdayLabels = [
    ...this.locale.weekdayLabels.slice(this.locale.weekStartsOn),
    ...this.locale.weekdayLabels.slice(0, this.locale.weekStartsOn),
  ];

  // Drilldown engines (provided at component level)
  protected readonly drillDayEngine = inject(CalendarEngine);
  protected readonly drillGranularityEngine = inject(GranularityPickerEngine);
  protected readonly drillViewMode = signal<DrillViewMode>('day');

  constructor() {
    effect(() => {
      this.grids().forEach((directive, index) => {
        SCENARIOS[index]?.configure(directive.engine);
      });
    });
  }

  protected currentMonthLabel(days: readonly CalendarDay[]): string {
    const current = days.find((d) => d.isCurrentMonth) ?? days[0];
    return `${current.date.getFullYear()} ${this.locale.monthLabels[current.date.getMonth()]}`;
  }

  protected toWeeks(grid: readonly CalendarDay[]): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) weeks.push(grid.slice(i, i + 7) as CalendarDay[]);
    return weeks;
  }

  protected ariaLabel(day: CalendarDay): string {
    const base = format(day.date, 'yyyy-MM-dd');
    if (day.isDisabled) return `${base}（不可選）`;
    if (day.isRangeStart) return `${base}（區間起點）`;
    if (day.isRangeEnd) return `${base}（區間終點）`;
    return base;
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

  // Drilldown methods
  protected drillZoomOut(): void {
    if (this.drillViewMode() === 'day') {
      const anchor = this.drillCurrentViewDate();
      this.drillGranularityEngine.setSelectionGranularity('month');
      this.drillGranularityEngine.setViewDate(anchor);
      this.drillViewMode.set('month');
    } else if (this.drillViewMode() === 'month') {
      const anchor = this.drillGranularityEngine.granularityGrids()[0]?.date ?? new Date();
      this.drillGranularityEngine.setSelectionGranularity('year');
      this.drillGranularityEngine.setViewDate(new Date(anchor.getFullYear() - 5, 0, 1));
      this.drillViewMode.set('year');
    }
  }

  protected drillPrev(): void {
    if (this.drillViewMode() === 'day') this.drillDayEngine.prevMonth();
    else this.drillGranularityEngine.prevYear();
  }

  protected drillNext(): void {
    if (this.drillViewMode() === 'day') this.drillDayEngine.nextMonth();
    else this.drillGranularityEngine.nextYear();
  }

  protected drillHeaderLabel(): string {
    switch (this.drillViewMode()) {
      case 'day': {
        const d = this.drillCurrentViewDate();
        return `${d.getFullYear()} ${this.locale.monthLabels[d.getMonth()]}`;
      }
      case 'month': {
        const cells = this.drillGranularityEngine.granularityGrids();
        return `${cells[0]?.date.getFullYear() ?? ''}`;
      }
      case 'year': {
        const cells = this.drillGranularityEngine.granularityGrids();
        if (cells.length === 0) return '';
        return `${cells[0].date.getFullYear()} – ${cells[cells.length - 1].date.getFullYear()}`;
      }
    }
  }

  protected onDrillYearClick(cell: GranularityCell): void {
    this.drillGranularityEngine.setSelectionGranularity('month');
    this.drillGranularityEngine.setViewDate(cell.date);
    this.drillViewMode.set('month');
  }

  protected onDrillMonthClick(cell: GranularityCell): void {
    this.drillDayEngine.setViewDate(cell.date);
    this.drillViewMode.set('day');
  }

  protected drillMonthLabel(cell: GranularityCell): string {
    return this.locale.monthLabels[cell.date.getMonth()];
  }

  protected drillFormatSelected(): string {
    const selected = this.drillDayEngine.selectedDate();
    return selected ? format(selected, 'yyyy-MM-dd') : '尚未選取';
  }

  private drillCurrentViewDate(): Date {
    const current = this.drillDayEngine.monthGrids()[0].find((d) => d.isCurrentMonth);
    return current?.date ?? new Date();
  }
}
