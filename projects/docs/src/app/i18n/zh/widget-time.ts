import type { WidgetRangeDictionary } from '../i18n.types';

export const widgetTime: WidgetRangeDictionary = {
  pageTitle: 'Widget Layer — DateTime',
  pageDescription:
    'Composed Widget 層（<code class="font-mono text-xs">@sanring/date-picker</code>）： DateTimePickerComponent，日期 + 時間複合選取器。',
  cardTitle: 'DateTimePicker（日期 + 時間模式）',
  cardDescription:
    '先點擊日期開啟 Time Draft，再以上下按鈕調整時分；按「確認」將完整 DateTime 寫入 model 並關閉，按「中止」或 Escape 捨棄 Draft 並回到上一個確認值。',
  placeholder: '選擇日期時間',
  selectedLabel: '已選：',
  notSelected: '尚未選取',
};
