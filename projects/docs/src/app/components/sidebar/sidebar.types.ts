export interface SidebarItem {
  readonly label: string;
  readonly path: string;
  readonly badge?: 'wip' | 'soon';
}

export interface SidebarSection {
  readonly label: string;
  /** Optional — when set, the section header links to this route (e.g. a section index page). */
  readonly path?: string;
  readonly items: readonly SidebarItem[];
}
