import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <h1 class="mb-2 text-2xl font-bold text-foreground">{{ title() }}</h1>
    <p class="mb-8 text-muted"><ng-content /></p>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
}
