import { Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker';
import { DatePickerComponent } from '@sanring/date-picker-widget';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from '../../components/ui/card';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-widget-page',
  imports: [
    PageHeaderComponent,
    DatePickerComponent,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
  ],
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
