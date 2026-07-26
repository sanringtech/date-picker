import type { HomeDictionary } from '../i18n.types';

export const home: HomeDictionary = {
  hero: {
    title: 'The Angular date picker system for product UI.',
    description:
      'date-picker is the entry point: the widget layer above gives you a ready-to-ship experience, and the engine layer below stays independently usable, so product development and deep customization share the same date-selection core.',
    ctaPrimary: 'Get started with DatePicker',
    ctaSecondary: 'Explore the engine',
  },
  previewCard: {
    subtitle: 'See it in action, not just described.',
    prevMonthLabel: 'Previous month',
    nextMonthLabel: 'Next month',
    timePickerLabel: 'Time picker',
    increaseHourLabel: 'Increase hour',
    decreaseHourLabel: 'Decrease hour',
    increaseMinuteLabel: 'Increase minute',
    decreaseMinuteLabel: 'Decrease minute',
    currentTimeLabel: 'Current time',
    widgetLinkLabel: 'Widget →',
    engineLinkLabel: 'Engine →',
  },
  widgetSection: {
    eyebrow: 'Widget layer',
    title: 'Start product screens with Widget.',
    descriptionPrefix:
      'Widget composes the input, overlay, calendar interaction, and formatting state, so',
    descriptionSuffix: 'can go directly into forms and filters.',
    datePickerTitle: 'DatePicker',
    datePickerDescription:
      'Single date selection, ideal for form fields, booking dates, expiry dates, and date conditions.',
    datePickerCta: 'Open the Single demo →',
    rangeTitle: 'DateRangePicker',
    rangeDescription:
      'Start/end range selection, ideal for report filters, stay durations, order lookups, and event periods.',
    rangeCta: 'Open the Range demo →',
    adoptionTitle: 'Two adoption paths',
    adoptionDescription:
      'Adopt quickly via npm, or copy the widget markup for full style and interaction ownership.',
    adoptionCta: 'Compare install modes →',
  },
  engineSection: {
    eyebrow: 'Engine foundation',
    title: 'Use Engine when the UI needs full control.',
    description:
      'Engine handles date math, selection rules, keyboard navigation, and disabled dates for deeper customization.',
    cta: 'Engine overview',
    calendarTitle: 'CalendarEngine',
    calendarDescription: 'Single / range / multi, a 42-cell grid, keyboard navigation.',
    calendarTag: 'M1-M6 →',
    granularityTitle: 'GranularityPickerEngine',
    granularityDescription:
      'Month / quarter / year granularity selection and fiscal-year settings.',
    granularityTag: 'M7 →',
    timeTitle: 'TimeAdjustmentEngine',
    timeDescription: 'Draft/confirm lifecycle and time-precision configuration.',
    timeTag: 'M8 →',
  },
};
