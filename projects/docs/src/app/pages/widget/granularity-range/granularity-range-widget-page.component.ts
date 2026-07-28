import { Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker-core';
import type { DateRange } from '@sanring/date-picker-core';
import { DateGranularityRangePickerComponent } from '@sanring/date-picker';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { WidgetDemoComponent } from '../../../components/widget-demo/widget-demo.component';
import { I18nService } from '../../../i18n/i18n.service';

const EMPTY_RANGE: DateRange = { start: null, end: null };

@Component({
  selector: 'app-granularity-range-widget-page',
  imports: [PageHeaderComponent, DateGranularityRangePickerComponent, WidgetDemoComponent],
  templateUrl: './granularity-range-widget-page.component.html',
})
export class GranularityRangeWidgetPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetGranularityRange);
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedRange = signal<DateRange>(EMPTY_RANGE);

  protected formatSelected(): string {
    const { start, end } = this.selectedRange();
    if (start === null || end === null) return this.t().notSelected;
    return `${format(start, 'yyyy-MM')} ~ ${format(end, 'yyyy-MM')}`;
  }
}
