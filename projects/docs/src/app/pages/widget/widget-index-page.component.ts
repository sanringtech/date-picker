import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { I18nService } from '../../i18n/i18n.service';

interface WidgetIndexItem {
  readonly title: string;
  readonly description: string;
  readonly path: string;
}

interface WidgetIndexSection {
  readonly heading: string;
  readonly items: readonly WidgetIndexItem[];
}

interface WidgetModeCard {
  readonly title: string;
  readonly subtitle: string;
  readonly installValue: string;
  readonly customizeValue: string;
  readonly updateValue: string;
  readonly command?: string;
}

@Component({
  selector: 'app-widget-index-page',
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './widget-index-page.component.html',
})
export class WidgetIndexPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().widgetIndex);
  protected readonly sections = computed<readonly WidgetIndexSection[]>(() => {
    const t = this.t();
    return [
      {
        heading: t.dayGroupHeading,
        items: [
          {
            title: t.singleTitle,
            description: t.singleDescription,
            path: '/widget/single',
          },
          {
            title: t.rangeTitle,
            description: t.rangeDescription,
            path: '/widget/range',
          },
          {
            title: t.multiTitle,
            description: t.multiDescription,
            path: '/widget/multi',
          },
        ],
      },
      {
        heading: t.granularityGroupHeading,
        items: [
          {
            title: t.granularityTitle,
            description: t.granularityDescription,
            path: '/widget/granularity',
          },
          {
            title: t.granularityRangeTitle,
            description: t.granularityRangeDescription,
            path: '/widget/granularity-range',
          },
          {
            title: t.granularityMultiTitle,
            description: t.granularityMultiDescription,
            path: '/widget/granularity-multi',
          },
        ],
      },
      {
        heading: t.timeGroupHeading,
        items: [
          {
            title: t.timeTitle,
            description: t.timeDescription,
            path: '/widget/time',
          },
          {
            title: t.timeRangeTitle,
            description: t.timeRangeDescription,
            path: '/widget/time-range',
          },
        ],
      },
    ];
  });

  protected readonly modeCards = computed<readonly WidgetModeCard[]>(() => {
    const t = this.t();
    return [
      {
        title: t.npmTitle,
        subtitle: t.npmSubtitle,
        installValue: t.npmInstallValueSuffix,
        customizeValue: t.npmCustomizeValue,
        updateValue: 'npm update',
        command: 'npm install @sanring/date-picker-widget @sanring/date-picker',
      },
      {
        title: t.copyTitle,
        subtitle: t.copySubtitle,
        installValue: t.copyInstallValue,
        customizeValue: t.copyCustomizeValue,
        updateValue: t.copyUpdateValue,
      },
    ];
  });
}
