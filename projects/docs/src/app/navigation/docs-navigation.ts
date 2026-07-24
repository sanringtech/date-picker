export interface DocsNavSection {
  readonly label: string;
  readonly items: readonly DocsNavItem[];
}

export interface DocsNavItem {
  readonly label: string;
  readonly path: string;
  readonly badge?: 'wip' | 'soon';
}

export const docsNavSections: readonly DocsNavSection[] = [
  {
    label: 'Engine',
    items: [
      { label: 'Calendar Engine', path: '/engine/calendar' },
      { label: 'Granularity Picker', path: '/engine/granularity' },
      { label: 'Time Adjustment', path: '/engine/time' },
    ],
  },
  {
    label: 'Widget',
    items: [{ label: 'Widget Layer', path: '/widget', badge: 'soon' }],
  },
];
