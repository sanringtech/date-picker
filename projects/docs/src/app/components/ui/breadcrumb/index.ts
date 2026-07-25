export * from './breadcrumb.component';
export * from './breadcrumb-item.component';
export * from './breadcrumb-list.component';
export * from './breadcrumb-link.component';
export * from './breadcrumb-page.component';
export * from './breadcrumb-divider.component';
export * from './breadcrumb-ellipsis.component';
export * from './breadcrumb.type';

// 便利陣列：imports: [SANRING_BREADCRUMB_IMPORTS] 一行搞定
import { BreadcrumbComponent } from './breadcrumb.component';
import { BreadcrumbItemComponent } from './breadcrumb-item.component';
import { BreadcrumbListComponent } from './breadcrumb-list.component';
import { BreadcrumbLinkComponent } from './breadcrumb-link.component';
import { BreadcrumbPageComponent } from './breadcrumb-page.component';
import { BreadcrumbDividerComponent } from './breadcrumb-divider.component';
import { BreadcrumbEllipsisComponent } from './breadcrumb-ellipsis.component';

export const SANRING_BREADCRUMB_IMPORTS = [
  BreadcrumbComponent,
  BreadcrumbItemComponent,
  BreadcrumbListComponent,
  BreadcrumbLinkComponent,
  BreadcrumbPageComponent,
  BreadcrumbDividerComponent,
  BreadcrumbEllipsisComponent,
];
