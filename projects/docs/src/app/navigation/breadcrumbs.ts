import { docsNavSections, docsTopNavItems } from './docs-navigation';

export interface BreadcrumbLink {
  readonly label: string;
  /** Absent for the current page — rendered non-interactive. */
  readonly path?: string;
}

/** Resolves a route url into a breadcrumb trail using docsTopNavItems/docsNavSections as the source of truth. */
export function resolveBreadcrumbs(url: string): readonly BreadcrumbLink[] {
  const crumbs: BreadcrumbLink[] = [{ label: 'Home', path: '/' }];

  const topLevel = docsTopNavItems.find(
    (item) => url === item.path || url.startsWith(`${item.path}/`),
  );
  if (!topLevel) return crumbs;

  const isTopLevelPage = url === topLevel.path;
  crumbs.push({ label: topLevel.label, path: isTopLevelPage ? undefined : topLevel.path });
  if (isTopLevelPage) return crumbs;

  const section = docsNavSections.find((s) => s.label === topLevel.label);
  const activeItem = section?.items.find((item) => item.path === url);
  if (activeItem) {
    crumbs.push({ label: activeItem.label });
  }

  return crumbs;
}
