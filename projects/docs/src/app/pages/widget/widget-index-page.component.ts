import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-widget-index-page',
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './widget-index-page.component.html',
})
export class WidgetIndexPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetIndex);
}
