import type { WidgetRangeDictionary } from '../i18n.types';

export const widgetRange: WidgetRangeDictionary = {
  pageTitle: 'Widget Layer — Range',
  pageDescription:
    'Composed Widget 層（<code class="font-mono text-xs">@sanring/date-picker-widget</code>）： DateRangePickerComponent，雙月並排的區間選取器。',
  cardTitle: 'DateRangePicker（W2，Range 模式）',
  cardDescription:
    '點擊或聚焦任一輸入框開啟雙月並排月曆；第一次點擊設定起點（Draft），第二次點擊提交區間並關閉。方向鍵移動、Enter/Space 選取，Draft 中 Escape 或點擊外部會中止並回溯到中止前的舊值。',
  placeholder: '選擇日期',
  selectedLabel: '已選：',
  notSelected: '尚未選取',
};
