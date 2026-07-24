import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header/header.component';

@Component({
  selector: 'app-docs-shell',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <div class="min-h-dvh bg-background text-foreground">
      <app-header />
      <router-outlet />
    </div>
  `,
})
export class DocsShellComponent {}
