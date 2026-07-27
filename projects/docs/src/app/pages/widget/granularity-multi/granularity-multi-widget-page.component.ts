import { Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker';
import { DateGranularityMultiPickerComponent } from '@sanring/date-picker-widget';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from '../../../components/ui/card';
import { I18nService } from '../../../i18n/i18n.service';

@Component({
  selector: 'app-granularity-multi-widget-page',
  imports: [
    PageHeaderComponent,
    DateGranularityMultiPickerComponent,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
  ],
  templateUrl: './granularity-multi-widget-page.component.html',
})
export class GranularityMultiWidgetPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetGranularityMulti);
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedDates = signal<Date[]>([]);

  protected formatSelected(): string {
    const dates = this.selectedDates();
    if (dates.length === 0) return this.t().notSelected;
    return dates.map((d) => format(d, 'yyyy')).join(', ');
  }
}
