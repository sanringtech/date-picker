import type { WidgetDateRangeDictionary } from '../i18n.types';

export const widgetRange: WidgetDateRangeDictionary = {
  pageTitle: 'Widget Layer — Range',
  pageDescription:
    'Composed widget layer (<code class="font-mono text-xs">@sanring/date-picker</code>): range selection shown as dual-trigger dual-month, combined-trigger dual-month, and two-trigger single-month patterns.',
  cardTitle: 'DateRangePicker (dual-month, dual trigger)',
  cardDescription:
    'Start and end triggers share one side-by-side dual-month overlay. The first click sets the draft start, and the second click commits the range.',
  combinedCardTitle: 'DateRangePicker (dual-month, combined trigger)',
  combinedCardDescription:
    'One trigger displays the full range and opens the same side-by-side dual-month overlay for start/end selection. This fits filter bars and compact toolbars.',
  singleMonthCardTitle: 'DateRangePicker (single-month mode)',
  singleMonthCardDescription:
    'Start and end each use a DatePicker trigger. Each trigger opens its own single-month calendar, which fits narrower forms or interfaces that need explicit start/end controls.',
  placeholder: 'Select date',
  startPlaceholder: 'Start date',
  endPlaceholder: 'End date',
  selectedLabel: 'Selected: ',
  notSelected: 'Not selected',
};
