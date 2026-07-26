import { Component, computed, input } from '@angular/core';
import { cn } from '../ui/shared/utils';

type SectionVariant = 'stack' | 'split';
type SectionSpacing = 'default' | 'comfortable';

@Component({
  selector: 'app-section',
  templateUrl: './section.component.html',
})
export class SectionComponent {
  readonly title = input.required<string>();
  readonly heading = input<string>();
  readonly description = input<string>();
  readonly divided = input(false);
  readonly variant = input<SectionVariant>('stack');
  readonly spacing = input<SectionSpacing>('default');

  protected readonly sectionClass = computed(() =>
    cn(
      this.spacing() === 'comfortable' ? 'mt-16 first-of-type:mt-0' : 'mt-10 first-of-type:mt-0',
      this.divided() &&
        (this.spacing() === 'comfortable'
          ? 'border-t border-border pt-12'
          : 'border-t border-border pt-10'),
    ),
  );

  protected readonly headerClass = computed(() =>
    cn(this.spacing() === 'comfortable' ? 'mb-7' : 'mb-5'),
  );

  protected readonly splitClass = computed(() =>
    cn('grid gap-10 lg:grid-cols-[minmax(0,0.42fr)_1fr]'),
  );
}
