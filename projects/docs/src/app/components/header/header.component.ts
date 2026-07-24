import { Component, signal } from '@angular/core';
import { ButtonDirective } from '../ui/button';
import { LogoComponent } from '../logo/logo.component';
import { NavigationComponent } from '../navigation/navigation.component';

@Component({
  selector: 'app-header',
  imports: [ButtonDirective, LogoComponent, NavigationComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
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
