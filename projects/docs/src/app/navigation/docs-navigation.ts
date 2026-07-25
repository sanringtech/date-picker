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
    items: [{ label: 'Widget Layer', path: '/widget' }],
  },
];
