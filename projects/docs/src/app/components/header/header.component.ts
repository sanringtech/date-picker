import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ButtonDirective } from '../ui/button';
import { SwitchComponent } from '../ui/switch';
import { LogoComponent } from '../logo/logo.component';
import { NavigationComponent } from '../navigation/navigation.component';

@Component({
  selector: 'app-header',
  imports: [
    ButtonDirective,
    SwitchComponent,
    FormsModule,
    LogoComponent,
    NavigationComponent,
    LucideMoon,
    LucideSun,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  protected readonly isDark = signal(true);
  protected readonly themeSwitchId = 'header-theme-switch';

  protected setDark(dark: boolean): void {
    const root = document.documentElement;
    if (dark) {
      delete root.dataset['theme'];
    } else {
      root.dataset['theme'] = 'light';
    }
    this.isDark.set(dark);
  }
}
