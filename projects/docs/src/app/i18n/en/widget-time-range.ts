import type { WidgetRangeDictionary } from '../i18n.types';

export const widgetTimeRange: WidgetRangeDictionary = {
  pageTitle: 'Widget Layer — DateTimeRange',
  pageDescription:
    'Composed widget layer (<code class="font-mono text-xs">@sanring/date-picker</code>): DateTimeRangePickerComponent — combined date-range + dual-end time picker.',
  cardTitle: 'DateTimeRangePicker (date range + time mode)',
  cardDescription:
    'Two clicks select the date range, then start/end time steppers expand automatically. Confirm writes the full DateRange with times to the model; Abort or Escape discards the Time Draft and reverts to the last confirmed value.',
  placeholder: 'Select date & time',
  selectedLabel: 'Selected: ',
  notSelected: 'Not selected',
};
