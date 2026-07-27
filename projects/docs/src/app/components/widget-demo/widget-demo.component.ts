import { Component, input } from '@angular/core';

@Component({
  selector: 'app-widget-demo',
  standalone: true,
  templateUrl: './widget-demo.component.html',
})
export class WidgetDemoComponent {
  readonly controlClass = input('w-full max-w-xs');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly resultLabel = input.required<string>();
  readonly resultValue = input.required<string>();
}
