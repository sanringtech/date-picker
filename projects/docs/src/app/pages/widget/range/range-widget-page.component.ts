import { Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker';
import type { DateRange } from '@sanring/date-picker';
import { DateRangePickerComponent } from '@sanring/date-picker-widget';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { WidgetDemoComponent } from '../../../components/widget-demo/widget-demo.component';
import { I18nService } from '../../../i18n/i18n.service';

const EMPTY_RANGE: DateRange = { start: null, end: null };

@Component({
  selector: 'app-range-widget-page',
  imports: [PageHeaderComponent, DateRangePickerComponent, WidgetDemoComponent],
  templateUrl: './range-widget-page.component.html',
})
export class RangeWidgetPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetRange);
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedRange = signal<DateRange>(EMPTY_RANGE);

  protected formatSelected(): string {
    const { start, end } = this.selectedRange();
    if (start === null || end === null) return this.t().notSelected;
    return `${format(start, 'yyyy-MM-dd')} ~ ${format(end, 'yyyy-MM-dd')}`;
  }
}
