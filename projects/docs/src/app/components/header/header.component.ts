import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <a routerLink="/" class="flex items-center gap-2 font-semibold text-foreground no-underline">
          <span class="text-primary font-bold">@sanring</span>
          <span class="text-muted">/</span>
          <span>date-picker</span>
        </a>

        <nav class="flex items-center gap-1">
          <a
            routerLink="/engine"
            routerLinkActive="text-foreground bg-surface"
            [routerLinkActiveOptions]="{ exact: false }"
            class="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground no-underline"
          >
            Engine
          </a>
          <a
            routerLink="/widget"
            routerLinkActive="text-foreground bg-surface"
            class="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground no-underline"
          >
            Widget
          </a>
          <button
            type="button"
            class="ml-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground cursor-pointer bg-transparent"
            (click)="toggleTheme()"
          >
            {{ isDark() ? '☀' : '☾' }}
          </button>
        </nav>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  protected readonly isDark = signal(true);

  protected toggleTheme(): void {
    const root = document.documentElement;
    if (root.dataset['theme'] === 'light') {
      delete root.dataset['theme'];
      this.isDark.set(true);
    } else {
      root.dataset['theme'] = 'light';
      this.isDark.set(false);
    }
  }
}
