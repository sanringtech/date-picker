import { Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker-core';
import { DatePickerComponent } from '@sanring/date-picker';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { WidgetDemoComponent } from '../../components/widget-demo/widget-demo.component';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-widget-page',
  imports: [PageHeaderComponent, DatePickerComponent, WidgetDemoComponent],
  templateUrl: './widget-page.component.html',
})
export class WidgetPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetSingle);
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedDate = signal<Date | null>(null);

  protected formatSelected(): string {
    const date = this.selectedDate();
    return date ? format(date, 'yyyy-MM-dd') : this.t().notSelected;
  }
}
