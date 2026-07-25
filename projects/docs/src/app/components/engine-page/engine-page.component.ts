import { Component, input } from '@angular/core';
import { PageHeaderComponent } from '../page-header/page-header.component';

@Component({
  selector: 'app-engine-page',
  imports: [PageHeaderComponent],
  templateUrl: './engine-page.component.html',
})
export class EnginePageComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
