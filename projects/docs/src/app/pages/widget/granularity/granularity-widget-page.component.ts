import { Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker-core';
import { DateGranularityPickerComponent } from '@sanring/date-picker';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { WidgetDemoComponent } from '../../../components/widget-demo/widget-demo.component';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
  selector: 'app-granularity-widget-page',
  imports: [PageHeaderComponent, DateGranularityPickerComponent, WidgetDemoComponent],
  templateUrl: './granularity-widget-page.component.html',
})
export class GranularityWidgetPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetGranularity);
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedDate = signal<Date | null>(null);

  protected formatSelected(): string {
    const date = this.selectedDate();
    return date ? format(date, 'yyyy-MM') : this.t().notSelected;
  }
}
