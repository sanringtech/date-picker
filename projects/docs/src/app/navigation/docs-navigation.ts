export interface DocsNavSection {
  readonly label: string;
  readonly items: readonly DocsNavItem[];
}

export interface DocsNavItem {
  readonly label: string;
  readonly path: string;
  readonly badge?: 'wip' | 'soon';
}

export interface DocsTopNavItem {
  readonly label: string;
  readonly path: string;
}

export const docsTopNavItems: readonly DocsTopNavItem[] = [
  { label: 'Engine', path: '/engine' },
  { label: 'Widget', path: '/widget' },
];

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
