import type { WidgetRangeDictionary } from '../i18n.types';

export const widgetTimeRange: WidgetRangeDictionary = {
  pageTitle: 'Widget Layer — DateTimeRange',
  pageDescription:
    'Composed Widget 層（<code class="font-mono text-xs">@sanring/date-picker-widget</code>）： DateTimeRangePickerComponent，日期區間 + 雙端時間複合選取器。',
  cardTitle: 'DateTimeRangePicker（日期區間 + 時間模式）',
  cardDescription:
    '兩段點擊選定日期區間後，自動展開起始 / 結束雙組時間 stepper；按「確認」將含時分的完整 DateRange 寫入 model，按「中止」或 Escape 捨棄 Time Draft 並回到上一個確認值。',
  placeholder: '選擇日期時間',
  selectedLabel: '已選：',
  notSelected: '尚未選取',
};
