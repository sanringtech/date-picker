export type Locale = 'zh' | 'en';

export interface HeaderDictionary {
  readonly themeToggleToLight: string;
  readonly themeToggleToDark: string;
}

export interface HomeDictionary {
  readonly hero: {
    readonly title: string;
    readonly description: string;
    readonly ctaPrimary: string;
    readonly ctaSecondary: string;
  };
  readonly previewCard: {
    readonly subtitle: string;
    readonly prevMonthLabel: string;
    readonly nextMonthLabel: string;
    readonly selectedLabel: string;
    readonly notSelected: string;
    readonly widgetLinkLabel: string;
    readonly engineLinkLabel: string;
  };
  readonly widgetSection: {
    readonly eyebrow: string;
    readonly title: string;
    readonly descriptionPrefix: string;
    readonly descriptionSuffix: string;
    readonly datePickerTitle: string;
    readonly datePickerDescription: string;
    readonly datePickerCta: string;
    readonly rangeTitle: string;
    readonly rangeDescription: string;
    readonly rangeCta: string;
    readonly adoptionTitle: string;
    readonly adoptionDescription: string;
    readonly adoptionCta: string;
  };
  readonly engineSection: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly cta: string;
    readonly calendarTitle: string;
    readonly calendarDescription: string;
    readonly calendarTag: string;
    readonly granularityTitle: string;
    readonly granularityDescription: string;
    readonly granularityTag: string;
    readonly timeTitle: string;
    readonly timeDescription: string;
    readonly timeTag: string;
  };
}

export interface WidgetIndexDictionary {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly singleTitle: string;
  readonly singleDescription: string;
  readonly rangeTitle: string;
  readonly rangeDescription: string;
  readonly modesHeading: string;
  readonly modesDescriptionPrefix: string;
  readonly modesDescriptionSuffix: string;
  readonly npmTitle: string;
  readonly npmSubtitle: string;
  readonly installLabel: string;
  readonly npmInstallValueSuffix: string;
  readonly customizeLabel: string;
  readonly npmCustomizeValue: string;
  readonly updateLabel: string;
  readonly copyTitle: string;
  readonly copySubtitle: string;
  readonly copyInstallValue: string;
  readonly copyCustomizeValue: string;
  readonly copyUpdateValue: string;
  readonly copyStepsPrefix: string;
  readonly copyStepsSuffix: string;
}

export interface WidgetSingleDictionary {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly cardTitle: string;
  readonly cardDescription: string;
  readonly placeholder: string;
  readonly selectedLabel: string;
  readonly notSelected: string;
}

export interface WidgetRangeDictionary {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly cardTitle: string;
  readonly cardDescription: string;
  readonly placeholder: string;
  readonly selectedLabel: string;
  readonly notSelected: string;
}

export interface EngineIndexDictionary {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly calendarTitle: string;
  readonly calendarDescription: string;
  readonly granularityTitle: string;
  readonly granularityDescription: string;
  readonly timeTitle: string;
  readonly timeDescription: string;
  readonly styledHeading: string;
  readonly styledDescription: string;
  readonly calendarLabel: string;
  readonly datePickerLabel: string;
}

export interface Dictionary {
  readonly header: HeaderDictionary;
  readonly home: HomeDictionary;
  readonly widgetIndex: WidgetIndexDictionary;
  readonly widgetSingle: WidgetSingleDictionary;
  readonly widgetRange: WidgetRangeDictionary;
  readonly engineIndex: EngineIndexDictionary;
}
