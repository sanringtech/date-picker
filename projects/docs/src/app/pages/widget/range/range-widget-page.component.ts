import { Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker-core';
import type { DateRange, DisabledInput } from '@sanring/date-picker-core';
import { DatePickerComponent, DateRangePickerComponent } from '@sanring/date-picker';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { WidgetDemoComponent } from '../../../components/widget-demo/widget-demo.component';
import { I18nService } from '../../../i18n/i18n.service';

const EMPTY_RANGE: DateRange = { start: null, end: null };

@Component({
  selector: 'app-range-widget-page',
  imports: [
    PageHeaderComponent,
    DatePickerComponent,
    DateRangePickerComponent,
    WidgetDemoComponent,
  ],
  templateUrl: './range-widget-page.component.html',
})
export class RangeWidgetPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetRange);
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly dualSplitRange = signal<DateRange>(EMPTY_RANGE);
  protected readonly dualCombinedRange = signal<DateRange>(EMPTY_RANGE);
  protected readonly splitStartDate = signal<Date | null>(null);
  protected readonly splitEndDate = signal<Date | null>(null);
  protected readonly splitStartDisabled = computed<DisabledInput | undefined>(() => {
    const end = this.splitEndDate();
    return end ? (date: Date) => date > end : undefined;
  });
  protected readonly splitEndDisabled = computed<DisabledInput | undefined>(() => {
    const start = this.splitStartDate();
    return start ? (date: Date) => date < start : undefined;
  });

  protected formatDualSplitSelected(): string {
    return this.formatRange(this.dualSplitRange());
  }

  protected formatDualCombinedSelected(): string {
    return this.formatRange(this.dualCombinedRange());
  }

  protected formatSplitSelected(): string {
    const start = this.splitStartDate();
    const end = this.splitEndDate();
    if (start === null || end === null) return this.t().notSelected;
    return `${format(start, 'yyyy-MM-dd')} ~ ${format(end, 'yyyy-MM-dd')}`;
  }

  private formatRange(range: DateRange): string {
    const { start, end } = range;
    if (start === null || end === null) return this.t().notSelected;
    return `${format(start, 'yyyy-MM-dd')} ~ ${format(end, 'yyyy-MM-dd')}`;
  }
}
