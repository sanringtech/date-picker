import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  CdkConnectedOverlay,
  ConnectionPositionPair,
  Overlay,
  OverlayModule,
} from '@angular/cdk/overlay';
import { SelectComponent } from './select.component';
import { SelectContentPosition } from './select.type';
import { cn } from '../shared/utils';
import { OVERLAY_SURFACE_CLASS } from '../shared/component-styles';

const SELECT_CONTENT_GAP = 4;

const SELECT_CONTENT_POSITIONS: ConnectionPositionPair[] = [
  {
    originX: 'start',
    originY: 'bottom',
    overlayX: 'start',
    overlayY: 'top',
    offsetY: SELECT_CONTENT_GAP,
  },
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'bottom',
    offsetY: -SELECT_CONTENT_GAP,
  },
];

const SELECT_ITEM_ALIGNED_POSITIONS: ConnectionPositionPair[] = [
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'top',
  },
  {
    originX: 'start',
    originY: 'bottom',
    overlayX: 'start',
    overlayY: 'bottom',
  },
];

@Component({
  selector: 'sanring-select-content',
  standalone: true,
  imports: [OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (select.triggerOrigin; as origin) {
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="select.isOpen()"
        [cdkConnectedOverlayPositions]="positions()"
        [cdkConnectedOverlayOffsetY]="offsetY()"
        [cdkConnectedOverlayMatchWidth]="matchTriggerWidth()"
        [cdkConnectedOverlayUsePopover]="null"
        [cdkConnectedOverlayPush]="true"
        [cdkConnectedOverlayViewportMargin]="8"
        [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
        (attach)="handleAttach()"
        (overlayOutsideClick)="close()"
        (detach)="close()"
        (overlayKeydown)="handleOverlayKeydown($event)"
      >
        <div
          #content
          role="listbox"
          tabindex="-1"
          [id]="select.contentId"
          [attr.data-state]="select.isOpen() ? 'open' : 'closed'"
          [class]="contentClass()"
        >
          <ng-content></ng-content>
        </div>
      </ng-template>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class SelectContentComponent {
  protected readonly select = inject(SelectComponent);
  private readonly overlay = inject(Overlay);

  @ViewChild(CdkConnectedOverlay) private connectedOverlay?: CdkConnectedOverlay;
  @ViewChild('content') private contentRef?: ElementRef<HTMLElement>;

  readonly class = input<string | undefined>();
  readonly position = input<SelectContentPosition>('popper');
  readonly matchTriggerWidth = input(false, { transform: booleanAttribute });

  private readonly itemAlignedOffsetY = signal(0);

  protected readonly positions = computed(() =>
    this.position() === 'item-aligned' ? SELECT_ITEM_ALIGNED_POSITIONS : SELECT_CONTENT_POSITIONS,
  );
  protected readonly offsetY = computed(() =>
    this.position() === 'item-aligned' ? -this.itemAlignedOffsetY() : 0,
  );
  protected readonly scrollStrategy = this.overlay.scrollStrategies.close();

  protected readonly contentClass = computed(() =>
    cn(
      OVERLAY_SURFACE_CLASS,
      'z-50 max-h-96 min-w-32 overflow-y-auto rounded-[var(--sanring-radius-sm)] p-1.5 outline-none',
      this.matchTriggerWidth() ? 'w-full' : undefined,
      'animate-popover-in',
      this.class(),
    ),
  );

  protected close(): void {
    this.select.setOpen(false);
    this.itemAlignedOffsetY.set(0);
  }

  protected handleAttach(): void {
    if (this.position() !== 'item-aligned') return;

    queueMicrotask(() => {
      const selectedItem =
        this.contentRef?.nativeElement.querySelector<HTMLElement>('[data-state="checked"]');
      this.itemAlignedOffsetY.set(selectedItem?.offsetTop ?? 0);
      this.connectedOverlay?.overlayRef.updatePosition();
    });
  }

  protected handleOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }
}
