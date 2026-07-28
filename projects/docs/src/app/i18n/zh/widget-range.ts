import type { WidgetDateRangeDictionary } from '../i18n.types';

export const widgetRange: WidgetDateRangeDictionary = {
  pageTitle: 'Widget Layer — Range',
  pageDescription:
    'Composed Widget 層（<code class="font-mono text-xs">@sanring/date-picker-widget</code>）：區間選取同時展示雙月雙 trigger、雙月單 trigger 與雙 trigger 單月三種常見形態。',
  cardTitle: 'DateRangePicker（雙月模式，雙 Trigger）',
  cardDescription:
    '起始與結束兩個 trigger 共享同一個雙月並排 overlay；第一次點擊設定起點（Draft），第二次點擊提交區間並關閉。',
  combinedCardTitle: 'DateRangePicker（雙月模式，單 Trigger）',
  combinedCardDescription:
    '單一 trigger 顯示完整區間，開啟後仍使用雙月並排 overlay 選取起訖日期；適合 filter bar 或緊湊工具列。',
  singleMonthCardTitle: 'DateRangePicker（單月模式）',
  singleMonthCardDescription:
    '起始與結束各自使用一個 DatePicker trigger；每個 trigger 都開啟自己的單月月曆，適合表單空間較窄或需要明確拆開起訖日期的介面。',
  placeholder: '選擇日期',
  startPlaceholder: '起始日期',
  endPlaceholder: '結束日期',
  selectedLabel: '已選：',
  notSelected: '尚未選取',
};
