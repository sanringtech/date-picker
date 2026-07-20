import { Component, ViewChild, inject, signal } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';

/**
 * W0 scaffold: proves the CDK Overlay wiring works end to end
 * (create → attach → dispose) inside this workspace. Not the composed
 * DatePicker itself — anchoring to an input, positioning, and assembling
 * `CalendarEngine` land in W1/W2 per the PRD milestone plan.
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
export class DatePickerOverlayShellComponent {
  private readonly overlay = inject(Overlay);

  @ViewChild(CdkPortal, { static: true }) private readonly portal!: CdkPortal;

  private overlayRef: OverlayRef | null = null;
  readonly isOpen = signal(false);

  open(): void {
    if (this.overlayRef) {
      return;
    }
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      hasBackdrop: true,
    });
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.attach(this.portal);
    this.isOpen.set(true);
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }
}
