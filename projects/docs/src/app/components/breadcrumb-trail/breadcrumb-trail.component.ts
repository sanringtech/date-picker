import { Component, input } from '@angular/core';
import { SANRING_BREADCRUMB_IMPORTS } from '../ui/breadcrumb';
import type { BreadcrumbLink } from '../../navigation/breadcrumbs';

@Component({
  selector: 'app-breadcrumb-trail',
  imports: [...SANRING_BREADCRUMB_IMPORTS],
  templateUrl: './breadcrumb-trail.component.html',
})
export class BreadcrumbTrailComponent {
  readonly items = input.required<readonly BreadcrumbLink[]>();
}
