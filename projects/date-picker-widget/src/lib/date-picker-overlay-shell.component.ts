import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';

/** PRD §7: bottom-start preferred, flips to top-start when space runs out. */
const CONNECTED_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

/**
 * Shared Overlay open/close/dispose lifecycle for both DatePickerComponent and
 * (later) DateRangePickerComponent (PRD §4a: avoid duplicating this per component).
 * Anchors to `connectedTo` when provided (W1); falls back to W0's global-center
 * placement otherwise, so the original scaffold behavior still holds with no anchor.
 */
@Component({
  selector: 'sanring-date-picker-overlay-shell',
  imports: [PortalModule],
  template: `
    <ng-template cdkPortal>
      <ng-content />
    </ng-template>
  `,
})
export class DatePickerOverlayShellComponent implements OnDestroy {
  private readonly overlay = inject(Overlay);

  readonly connectedTo = input<ElementRef<HTMLElement> | undefined>(undefined);

  /**
   * Fires once per actual close — backdrop click, explicit close()/toggle(), all
   * funnel through here. W2's range component listens to this (rather than
   * duplicating a backdrop-click subscription of its own) to abort an
   * in-progress range Draft regardless of what triggered the close (PRD §7
   * Story 2 AC 2). Single-mode W1 has no Draft concept and simply doesn't
   * listen to it.
   */
  readonly closed = output<void>();

  @ViewChild(CdkPortal, { static: true }) private readonly portal!: CdkPortal;

  private overlayRef: OverlayRef | null = null;
  readonly isOpen = signal(false);

  open(): void {
    if (this.overlayRef) {
      return;
    }
    const anchor = this.connectedTo();
    this.overlayRef = this.overlay.create({
      positionStrategy: anchor
        ? this.overlay.position().flexibleConnectedTo(anchor).withPositions(CONNECTED_POSITIONS)
        : this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
    });
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.attach(this.portal);
    this.isOpen.set(true);
  }

  close(): void {
    if (!this.overlayRef) {
      return;
    }
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.isOpen.set(false);
    this.closed.emit();
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Overlay content lives in a global CDK container, not this component's own DOM subtree — must dispose explicitly or it leaks past destroy. */
  ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }
}
