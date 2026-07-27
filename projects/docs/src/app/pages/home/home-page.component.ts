import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../components/ui/button';
import { I18nService } from '../../i18n/i18n.service';
import { HomePreviewCardComponent } from './home-preview-card.component';

interface HomeLayerSection {
  title: string;
  heading: string;
  description: string;
  action?: {
    label: string;
    routerLink: string;
  };
  cards: HomeLayerCard[];
}

interface HomeLayerCard {
  title: string;
  description: string;
  routerLink: string;
  actionLabel: string;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ButtonDirective, HomePreviewCardComponent],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().home);

  protected readonly layerSections = computed<HomeLayerSection[]>(() => {
    const home = this.t();
    return [
      {
        title: home.widgetSection.eyebrow,
        heading: home.widgetSection.title,
        description: `${home.widgetSection.descriptionPrefix} <code class="rounded bg-surface-strong px-1 font-mono text-xs">@sanring/date-picker</code> ${home.widgetSection.descriptionSuffix}`,
        cards: [
          {
            title: home.widgetSection.datePickerTitle,
            description: home.widgetSection.datePickerDescription,
            routerLink: '/widget/single',
            actionLabel: home.widgetSection.datePickerCta,
          },
          {
            title: home.widgetSection.rangeTitle,
            description: home.widgetSection.rangeDescription,
            routerLink: '/widget/range',
            actionLabel: home.widgetSection.rangeCta,
          },
          {
            title: home.widgetSection.adoptionTitle,
            description: home.widgetSection.adoptionDescription,
            routerLink: '/widget',
            actionLabel: home.widgetSection.adoptionCta,
          },
        ],
      },
      {
        title: home.engineSection.eyebrow,
        heading: home.engineSection.title,
        description: home.engineSection.description,
        action: {
          label: home.engineSection.cta,
          routerLink: '/engine',
        },
        cards: [
          {
            title: home.engineSection.calendarTitle,
            description: home.engineSection.calendarDescription,
            routerLink: '/engine/calendar',
            actionLabel: home.engineSection.calendarTag,
          },
          {
            title: home.engineSection.granularityTitle,
            description: home.engineSection.granularityDescription,
            routerLink: '/engine/granularity',
            actionLabel: home.engineSection.granularityTag,
          },
          {
            title: home.engineSection.timeTitle,
            description: home.engineSection.timeDescription,
            routerLink: '/engine/time',
            actionLabel: home.engineSection.timeTag,
          },
        ],
      },
    ];
  });
}
