import type { WidgetRangeDictionary } from '../i18n.types';

export const widgetGranularityMulti: WidgetRangeDictionary = {
  pageTitle: 'Widget Layer — Granularity Multi',
  pageDescription:
    'Composed Widget 層（<code class="font-mono text-xs">@sanring/date-picker</code>）： DateGranularityMultiPickerComponent，年度 toggle 多選選取器。',
  cardTitle: 'DateGranularityMultiPicker（年度多選模式）',
  cardDescription:
    '每次點擊 toggle 一個年份；已選取年份以 Chip 顯示，可個別移除或一鍵清除全部。Overlay 在使用者按 Escape 或點擊外部前持續開啟。切換 granularity prop 可改為月份或季度多選。',
  placeholder: '選擇多個年份',
  selectedLabel: '已選：',
  notSelected: '尚未選取',
};
