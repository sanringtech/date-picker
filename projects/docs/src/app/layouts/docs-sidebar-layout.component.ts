import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { LucideMenu, LucideX } from '@lucide/angular';
import { ButtonDirective } from '../components/ui/button';
import { BreadcrumbTrailComponent } from '../components/breadcrumb-trail/breadcrumb-trail.component';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { docsNavSections } from '../navigation/docs-navigation';
import { resolveBreadcrumbs } from '../navigation/breadcrumbs';

@Component({
  selector: 'app-docs-sidebar-layout',
  imports: [
    RouterOutlet,
    SidebarComponent,
    BreadcrumbTrailComponent,
    ButtonDirective,
    LucideMenu,
    LucideX,
  ],
  template: `
    <div
      class="mx-auto flex max-w-[var(--dp-content-max-w)] flex-col gap-0 px-4 py-6 sm:px-6 lg:flex-row lg:py-8"
    >
      <button
        type="button"
        sanringBtn
        variant="outline"
        size="sm"
        class="mb-4 flex items-center justify-center gap-2 lg:hidden"
        [attr.aria-expanded]="mobileNavOpen()"
        (click)="toggleMobileNav()"
      >
        @if (mobileNavOpen()) {
          <svg lucideX [size]="16"></svg>
        } @else {
          <svg lucideMenu [size]="16"></svg>
        }
        選單
      </button>

      <div
        [class]="(mobileNavOpen() ? 'block' : 'hidden') + ' mb-6 lg:mb-0 lg:block'"
        (click)="closeMobileNav()"
      >
        <app-sidebar [sections]="sections" />
      </div>

      <main class="min-w-0 flex-1">
        <app-breadcrumb-trail [items]="breadcrumbs()" />
        <router-outlet />
      </main>
    </div>
  `,
})
export class DocsSidebarLayoutComponent {
  protected readonly sections = docsNavSections;
  protected readonly mobileNavOpen = signal(false);

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly breadcrumbs = computed(() => resolveBreadcrumbs(this.url()));

  constructor() {
    effect(() => {
      this.url();
      this.mobileNavOpen.set(false);
    });
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
