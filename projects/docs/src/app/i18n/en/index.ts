import type { Dictionary } from '../i18n.types';
import { header } from './header';
import { home } from './home';
import { widgetIndex } from './widget-index';
import { widgetSingle } from './widget-single';
import { widgetRange } from './widget-range';
import { widgetMulti } from './widget-multi';
import { widgetGranularity } from './widget-granularity';
import { widgetGranularityRange } from './widget-granularity-range';
import { widgetGranularityMulti } from './widget-granularity-multi';
import { widgetTime } from './widget-time';
import { widgetTimeRange } from './widget-time-range';
import { engineIndex } from './engine-index';

export const enDictionary: Dictionary = {
  header,
  home,
  widgetIndex,
  widgetSingle,
  widgetRange,
  widgetMulti,
  widgetGranularity,
  widgetGranularityRange,
  widgetGranularityMulti,
  widgetTime,
  widgetTimeRange,
  engineIndex,
};
