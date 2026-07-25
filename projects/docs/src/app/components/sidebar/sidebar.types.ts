export interface SidebarItem {
  readonly label: string;
  readonly path: string;
  readonly badge?: 'wip' | 'soon';
}

export interface SidebarSection {
  readonly label: string;
  readonly items: readonly SidebarItem[];
}
