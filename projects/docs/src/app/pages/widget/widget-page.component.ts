import { Component, inject, signal } from '@angular/core';
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
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedDate = signal<Date | null>(null);

  protected formatSelected(): string {
    const date = this.selectedDate();
    return date ? format(date, 'yyyy-MM-dd') : '尚未選取';
  }
}
