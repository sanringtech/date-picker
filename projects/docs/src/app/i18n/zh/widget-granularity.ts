import type { WidgetRangeDictionary } from '../i18n.types';

export const widgetGranularity: WidgetRangeDictionary = {
  pageTitle: 'Widget Layer — Granularity',
  pageDescription:
    'Composed Widget 層（<code class="font-mono text-xs">@sanring/date-picker-widget</code>）： DateGranularityPickerComponent，月份 / 季度 / 年度單選選取器。',
  cardTitle: 'DateGranularityPicker（月份模式）',
  cardDescription:
    '以網格展示 12 個月份；方向鍵移動焦點，PageUp/PageDown 跨年，Enter/Space 選取，Escape 關閉。切換 granularity prop 可改為季度（4 格）或年度（N 格滑動視窗）模式。',
  placeholder: '選擇月份',
  selectedLabel: '已選：',
  notSelected: '尚未選取',
};
