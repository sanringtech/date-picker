import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
  private readonly todayFn = inject(CALENDAR_TODAY);
  private readonly previewGrid = viewChild(CalendarGridDirective);

  protected readonly weekdayLabels = [
    ...this.locale.weekdayLabels.slice(this.locale.weekStartsOn),
    ...this.locale.weekdayLabels.slice(0, this.locale.weekStartsOn),
  ];

  /** True while the calendar/time picker mirror the live clock instead of a manual pick. */
  protected readonly isLive = signal(true);
  protected readonly now = signal(new Date());
  private readonly manualHour = signal<number | null>(null);
  private readonly manualMinute = signal<number | null>(null);
  protected readonly pickerHour = computed(() => this.manualHour() ?? this.now().getHours());
  protected readonly pickerMinute = computed(() => this.manualMinute() ?? this.now().getMinutes());
  private idleTimeoutId?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => {
      this.previewGrid()?.engine.selectDate(this.todayFn());
    });

    const intervalId = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(intervalId);
      clearTimeout(this.idleTimeoutId);
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

  protected adjustPickerHour(delta: number): void {
    this.manualHour.set((this.pickerHour() + delta + 24) % 24);
    this.markInteraction();
  }

  protected adjustPickerMinute(delta: number): void {
    this.manualMinute.set((this.pickerMinute() + delta + 60) % 60);
    this.markInteraction();
  }

  protected formatNow(date: Date): string {
    return format(date, 'MM/dd HH:mm');
  }

  /** Marks a manual date/time interaction: leaves live mode and (re)starts the 30s idle revert. */
  protected markInteraction(): void {
    this.isLive.set(false);
    clearTimeout(this.idleTimeoutId);
    this.idleTimeoutId = setTimeout(() => this.revertToLive(), 30_000);
  }

  private revertToLive(): void {
    this.isLive.set(true);
    this.manualHour.set(null);
    this.manualMinute.set(null);
    this.previewGrid()?.engine.selectDate(this.todayFn());
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
