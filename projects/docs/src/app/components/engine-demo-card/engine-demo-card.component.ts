import { Component, input } from '@angular/core';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionDirective,
  CardTitleDirective,
} from '../ui/card';

@Component({
  selector: 'app-engine-demo-card',
  standalone: true,
  imports: [CardComponent, CardContentComponent, CardTitleDirective, CardDescriptionDirective],
  templateUrl: './engine-demo-card.component.html',
})
export class EngineDemoCardComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly inputAreaClass = input('w-full max-w-[20rem] shrink-0 sm:w-80');
}
