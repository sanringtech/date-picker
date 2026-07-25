import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { docsNavSections } from '../navigation/docs-navigation';

@Component({
  selector: 'app-docs-sidebar-layout',
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="mx-auto flex max-w-[var(--dp-content-max-w)] gap-0 px-6 py-8">
      <app-sidebar [sections]="sections" />
      <main class="min-w-0 flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class DocsSidebarLayoutComponent {
  protected readonly sections = docsNavSections;
}
