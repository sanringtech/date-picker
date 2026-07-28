import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronDown } from '@lucide/angular';
import { ErrorMessageComponent, FieldLabelDirective, SanringFieldComponent } from '../ui/field';
import { InputDirective } from '../ui/input';
import { SANRING_SELECT_IMPORTS } from '../ui/select';

type DemoInputMode = 'select' | 'manual';
type DemoManualInputMode = 'single' | 'range';

@Component({
  selector: 'app-widget-demo',
  standalone: true,
  imports: [
    FormsModule,
    SanringFieldComponent,
    FieldLabelDirective,
    ErrorMessageComponent,
    InputDirective,
    SANRING_SELECT_IMPORTS,
    LucideChevronDown,
  ],
  templateUrl: './widget-demo.component.html',
  styleUrl: './widget-demo.component.css',
})
export class WidgetDemoComponent {
  readonly controlClass = input('w-full max-w-xs');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly resultLabel = input.required<string>();
  readonly resultValue = input.required<string>();
  readonly manualInputMode = input<DemoManualInputMode>('single');

  protected demoMode: DemoInputMode = 'select';
  protected manualInputValue = '';
  protected manualStartValue = '';
  protected manualEndValue = '';
  protected readonly manualInputPattern = '^\\d{4}-\\d{2}-\\d{2}$';

  protected displayedResult(): string {
    if (this.demoMode === 'manual') {
      if (this.manualInputMode() === 'range') {
        const start = this.manualStartValue.trim();
        const end = this.manualEndValue.trim();
        if (!start && !end) return '尚未輸入';
        if (this.manualRangeOrderInvalid()) return '起始日期不可晚於結束日期';
        return `${start || '...'} ~ ${end || '...'}`;
      }

      return this.manualInputValue.trim() || '尚未輸入';
    }

    return this.resultValue();
  }

  protected manualRangeOrderInvalid(): boolean {
    const start = this.parseManualDate(this.manualStartValue);
    const end = this.parseManualDate(this.manualEndValue);
    return start !== null && end !== null && start.getTime() > end.getTime();
  }

  private parseManualDate(value: string): Date | null {
    const trimmed = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }

    return date;
  }
}
