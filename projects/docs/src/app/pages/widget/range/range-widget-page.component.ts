import { Component, inject, signal } from '@angular/core';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE } from '@sanring/date-picker';
import type { DateRange } from '@sanring/date-picker';
import { DateRangePickerComponent } from '@sanring/date-picker-widget';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from '../../../components/ui/card';

const EMPTY_RANGE: DateRange = { start: null, end: null };

@Component({
  selector: 'app-range-widget-page',
  imports: [
    PageHeaderComponent,
    DateRangePickerComponent,
    CardComponent,
    CardContentComponent,
    CardTitleDirective,
    CardDescriptionDirective,
  ],
  templateUrl: './range-widget-page.component.html',
})
export class RangeWidgetPageComponent {
  protected readonly locale = inject(CALENDAR_LOCALE);
  protected readonly selectedRange = signal<DateRange>(EMPTY_RANGE);

  protected formatSelected(): string {
    const { start, end } = this.selectedRange();
    if (start === null || end === null) return '尚未選取';
    return `${format(start, 'yyyy-MM-dd')} ~ ${format(end, 'yyyy-MM-dd')}`;
  }
}
