import { Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker-core';
import { DateMultiPickerComponent } from '@sanring/date-picker';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { WidgetDemoComponent } from '../../../components/widget-demo/widget-demo.component';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
  selector: 'app-multi-widget-page',
  imports: [PageHeaderComponent, DateMultiPickerComponent, WidgetDemoComponent],
  templateUrl: './multi-widget-page.component.html',
})
export class MultiWidgetPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetMulti);
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedDates = signal<Date[]>([]);

  protected formatSelected(): string {
    const dates = this.selectedDates();
    if (dates.length === 0) return this.t().notSelected;
    return dates.map((d) => format(d, 'yyyy-MM-dd')).join(', ');
  }
}
