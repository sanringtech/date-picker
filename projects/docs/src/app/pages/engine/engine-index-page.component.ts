import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SANRING_UI_LINKS } from '../../navigation/external-links';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-engine-index-page',
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './engine-index-page.component.html',
})
export class EngineIndexPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().engineIndex);
  protected readonly uiLinks = SANRING_UI_LINKS;
}
