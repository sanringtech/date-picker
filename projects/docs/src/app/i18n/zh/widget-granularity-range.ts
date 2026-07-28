import type { WidgetRangeDictionary } from '../i18n.types';

export const widgetGranularityRange: WidgetRangeDictionary = {
  pageTitle: 'Widget Layer — Granularity Range',
  pageDescription:
    'Composed Widget 層（<code class="font-mono text-xs">@sanring/date-picker-widget</code>）： DateGranularityRangePickerComponent，月份 / 季度 / 年度區間選取器。',
  cardTitle: 'DateGranularityRangePicker（月份區間模式）',
  cardDescription:
    '第一次點擊設定起點（Draft），第二次點擊提交月份區間；Draft 中 Escape 或點擊外部中止並回溯。isInRange 區間內的月份以淡色高亮顯示。',
  placeholder: '選擇月份',
  selectedLabel: '已選：',
  notSelected: '尚未選取',
};
