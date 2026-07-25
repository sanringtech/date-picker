import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { BreadcrumbTrailComponent } from '../components/breadcrumb-trail/breadcrumb-trail.component';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { docsNavSections } from '../navigation/docs-navigation';
import { resolveBreadcrumbs } from '../navigation/breadcrumbs';

@Component({
  selector: 'app-docs-sidebar-layout',
  imports: [RouterOutlet, SidebarComponent, BreadcrumbTrailComponent],
  template: `
    <div class="mx-auto flex max-w-[var(--dp-content-max-w)] gap-0 px-6 py-8">
      <app-sidebar [sections]="sections" />
      <main class="min-w-0 flex-1">
        <app-breadcrumb-trail [items]="breadcrumbs()" />
        <router-outlet />
      </main>
    </div>
  `,
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
