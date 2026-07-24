import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header/header.component';
import { FooterComponent } from '../components/footer/footer.component';

@Component({
  selector: 'app-docs-shell',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <div class="flex min-h-dvh flex-col bg-background text-foreground">
      <app-header />
      <div class="flex-1">
        <router-outlet />
      </div>
      <app-footer />
    </div>
  `,
})
export class DocsShellComponent {}
