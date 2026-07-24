import { Component, effect, inject, viewChildren } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import { CALENDAR_LOCALE, GranularityGridDirective } from '@sanring/date-picker';
import type { GranularityCell, GranularityPickerEngine, PickerGranularity } from '@sanring/date-picker';
import { ButtonDirective } from '../../../components/ui/button';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from '../../../components/ui/card';

interface GranularityScenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly granularity: PickerGranularity;
  readonly mode: 'single' | 'range' | 'multi';
}

const SCENARIOS: readonly GranularityScenario[] = [
  {
    id: 'month-picker',
    title: '月份選取（Month-picker）',
    description: '12 格月網格，單選模式，語意與日網格的 single 完全對稱。',
    granularity: 'month',
    mode: 'single',
  },
  {
    id: 'quarter-picker',
    title: '季度區間選取（Quarter-picker）',
    description:
      '4 格季網格，財年起始月注入為 4 月（CALENDAR_QUARTER_STARTS_ON = 3），示範財年 vs 公曆季度歧義；區間模式：先選起點再選終點。',
    granularity: 'quarter',
    mode: 'range',
  },
  {
    id: 'year-picker',
    title: '年份多選（Year-picker）',
    description: 'N 格年網格（滑動視窗），多選模式累積不連續年份。',
    granularity: 'year',
    mode: 'multi',
  },
];

@Component({
  selector: 'app-granularity-engine-page',
  imports: [
    GranularityGridDirective,
    ButtonDirective,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX,
  ],
  templateUrl: './granularity-engine-page.component.html',
})
export class GranularityEnginePageComponent {
  protected readonly scenarios = SCENARIOS;
  private readonly locale = inject(CALENDAR_LOCALE);
  private readonly grids = viewChildren(GranularityGridDirective);

  constructor() {
    effect(() => {
      this.grids().forEach((directive, index) => {
        const scenario = SCENARIOS[index];
        if (!scenario) return;
        directive.engine.setSelectionGranularity(scenario.granularity);
        directive.engine.setSelectionMode(scenario.mode);
        directive.engine.setGridColumns(scenario.granularity === 'quarter' ? 2 : 3);
      });
    });
  }

  protected gridCols(granularity: PickerGranularity): string {
    return granularity === 'quarter' ? 'grid-cols-2' : 'grid-cols-3';
  }

  protected cellLabel(granularity: PickerGranularity, cell: GranularityCell, index: number): string {
    switch (granularity) {
      case 'month': return this.locale.monthLabels[cell.date.getMonth()];
      case 'quarter': return `Q${index + 1}`;
      case 'year': return `${cell.date.getFullYear()}`;
    }
  }

  protected headerLabel(granularity: PickerGranularity, engine: GranularityPickerEngine): string {
    const cells = engine.granularityGrids();
    if (cells.length === 0) return '';
    if (granularity === 'year')
      return `${cells[0].date.getFullYear()} – ${cells[cells.length - 1].date.getFullYear()}`;
    if (granularity === 'quarter') return `FY${cells[0].date.getFullYear()}`;
    return `${cells[0].date.getFullYear()}`;
  }

  protected formatDate(granularity: PickerGranularity, engine: GranularityPickerEngine, date: Date): string {
    switch (granularity) {
      case 'month':
        return `${date.getFullYear()} ${this.locale.monthLabels[date.getMonth()]}`;
      case 'quarter': {
        const cells = engine.granularityGrids();
        const i = cells.findIndex((c) => c.date.getTime() === date.getTime());
        return `FY${date.getFullYear()} Q${i >= 0 ? i + 1 : '?'}`;
      }
      case 'year':
        return `${date.getFullYear()}`;
    }
  }
}
