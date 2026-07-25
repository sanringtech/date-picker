import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SANRING_BREADCRUMB_IMPORTS } from '../components/ui/breadcrumb';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { docsNavSections } from '../navigation/docs-navigation';
import { resolveBreadcrumbs } from '../navigation/breadcrumbs';

@Component({
  selector: 'app-docs-sidebar-layout',
  imports: [RouterOutlet, SidebarComponent, ...SANRING_BREADCRUMB_IMPORTS],
  templateUrl: './docs-sidebar-layout.component.html',
})
export class DocsSidebarLayoutComponent {
  protected readonly sections = docsNavSections;

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly breadcrumbs = computed(() => resolveBreadcrumbs(this.url()));
}
