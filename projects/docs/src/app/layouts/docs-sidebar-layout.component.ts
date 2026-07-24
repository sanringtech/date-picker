import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonDirective } from '../components/ui/button';
import { docsNavSections } from '../navigation/docs-navigation';

@Component({
  selector: 'app-docs-sidebar-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonDirective],
  template: `
    <div class="mx-auto flex max-w-5xl gap-0 px-6 py-8">
      <!-- Sidebar -->
      <aside class="w-52 shrink-0 pr-8">
        <nav>
          @for (section of sections; track section.label) {
            <div class="mb-6">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {{ section.label }}
              </p>
              <ul class="space-y-0.5 list-none p-0 m-0">
                @for (item of section.items; track item.path) {
                  <li>
                    <a
                      sanringBtn
                      variant="ghost"
                      size="sm"
                      [routerLink]="item.path"
                      routerLinkActive
                      #rla="routerLinkActive"
                      [class]="
                        (rla.isActive ? 'bg-surface-strong text-foreground' : 'text-muted') +
                        ' w-full justify-between no-underline'
                      "
                    >
                      {{ item.label }}
                      @if (item.badge === 'soon') {
                        <span
                          class="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted"
                        >
                          soon
                        </span>
                      }
                      @if (item.badge === 'wip') {
                        <span
                          class="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                        >
                          wip
                        </span>
                      }
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
        </nav>
      </aside>

      <!-- Content -->
      <main class="min-w-0 flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class DocsSidebarLayoutComponent {
  protected readonly sections = docsNavSections;
}
