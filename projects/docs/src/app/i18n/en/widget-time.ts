import type { WidgetRangeDictionary } from '../i18n.types';

export const widgetTime: WidgetRangeDictionary = {
  pageTitle: 'Widget Layer — DateTime',
  pageDescription:
    'Composed widget layer (<code class="font-mono text-xs">@sanring/date-picker-widget</code>): DateTimePickerComponent — combined date + time picker.',
  cardTitle: 'DateTimePicker (date + time mode)',
  cardDescription:
    'Click a date to open the Time Draft, then adjust hours/minutes with the stepper buttons. Confirm writes the full DateTime to the model and closes; Abort or Escape discards the draft and reverts to the last confirmed value.',
  placeholder: 'Select date & time',
  selectedLabel: 'Selected: ',
  notSelected: 'Not selected',
};
