import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ButtonDirective } from '../ui/button';
import { SwitchComponent } from '../ui/switch';
import { LogoComponent } from '../logo/logo.component';
import { NavigationComponent } from '../navigation/navigation.component';
import { I18nService } from '../../i18n/i18n.service';
import type { Locale } from '../../i18n/i18n.types';

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
  protected readonly i18n = inject(I18nService);
  protected readonly isDark = signal(true);
  protected readonly themeSwitchId = 'header-theme-switch';

  protected toggleLocale(): void {
    this.i18n.setLocale(this.i18n.locale() === 'zh' ? 'en' : 'zh');
  }

  protected nextLocaleLabel(locale: Locale): string {
    return locale === 'zh' ? 'EN' : '中文';
  }

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
