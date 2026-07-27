import type { SidebarSection } from '../components/sidebar/sidebar.types';

export interface DocsTopNavItem {
  readonly label: string;
  readonly path: string;
}

export const docsTopNavItems: readonly DocsTopNavItem[] = [
  { label: 'Engine', path: '/engine' },
  { label: 'Widget', path: '/widget' },
];

export const docsNavSections: readonly SidebarSection[] = [
  {
    label: 'Engine',
    path: '/engine',
    items: [
      { label: 'Calendar Engine', path: '/engine/calendar' },
      { label: 'Granularity Picker', path: '/engine/granularity' },
      { label: 'Time Adjustment', path: '/engine/time' },
    ],
  },
  {
    label: 'Widget',
    path: '/widget',
    items: [
      { label: 'DatePicker (Single)', path: '/widget/single' },
      { label: 'DateRangePicker', path: '/widget/range' },
      { label: 'DateMultiPicker', path: '/widget/multi' },
      { label: 'DateGranularityPicker', path: '/widget/granularity' },
      { label: 'DateGranularityRangePicker', path: '/widget/granularity-range' },
      { label: 'DateGranularityMultiPicker', path: '/widget/granularity-multi' },
      { label: 'DateTimePicker', path: '/widget/time' },
      { label: 'DateTimeRangePicker', path: '/widget/time-range' },
    ],
  },
];
