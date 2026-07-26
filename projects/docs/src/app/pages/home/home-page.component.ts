import { afterNextRender, Component, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns/format';
import { CALENDAR_LOCALE, CALENDAR_TODAY, CalendarGridDirective } from '@sanring/date-picker';
import type { CalendarDay } from '@sanring/date-picker';
import { ButtonDirective } from '../../components/ui/button';
import { I18nService } from '../../i18n/i18n.service';

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
  imports: [RouterLink, ButtonDirective, CalendarGridDirective],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = computed(() => this.i18n.t().home);
  protected readonly locale = inject(CALENDAR_LOCALE);
  private readonly today = inject(CALENDAR_TODAY)();
  private readonly previewGrid = viewChild(CalendarGridDirective);

  protected readonly weekdayLabels = [
    ...this.locale.weekdayLabels.slice(this.locale.weekStartsOn),
    ...this.locale.weekdayLabels.slice(0, this.locale.weekStartsOn),
  ];

  constructor() {
    afterNextRender(() => {
      this.previewGrid()?.engine.selectDate(this.today);
    });
  }

  protected currentMonthLabel(days: readonly CalendarDay[]): string {
    const current = days.find((d) => d.isCurrentMonth) ?? days[0];
    return `${current.date.getFullYear()} ${this.locale.monthLabels[current.date.getMonth()]}`;
  }

  protected toWeeks(days: readonly CalendarDay[]): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) weeks.push(days.slice(i, i + 7) as CalendarDay[]);
    return weeks;
  }

  protected formatSelectedDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  protected weekdayLabelFor(date: Date): string {
    return this.locale.weekdayLabels[date.getDay()];
  }

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
