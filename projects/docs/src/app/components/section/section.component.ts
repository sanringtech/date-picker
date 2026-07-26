import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section',
  templateUrl: './section.component.html',
})
export class SectionComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
