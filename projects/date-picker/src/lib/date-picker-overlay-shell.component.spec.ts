import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePickerOverlayShellComponent } from './date-picker-overlay-shell.component';

@Component({
  selector: 'sanring-test-host',
  imports: [DatePickerOverlayShellComponent],
  template: `
    <sanring-date-picker-overlay-shell>
      <div class="panel-content">panel</div>
    </sanring-date-picker-overlay-shell>
  `,
})
class TestHostComponent {
  @ViewChild(DatePickerOverlayShellComponent, { static: true })
  shell!: DatePickerOverlayShellComponent;
}

describe('DatePickerOverlayShellComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts closed with no overlay attached to the document', () => {
    expect(host.shell.isOpen()).toBe(false);
    expect(document.querySelector('.panel-content')).toBeNull();
  });

  it('attaches the overlay and marks isOpen on open()', () => {
    host.shell.open();

    expect(host.shell.isOpen()).toBe(true);
    expect(document.querySelector('.panel-content')).not.toBeNull();
  });

  it('disposes the overlay and clears isOpen on close()', () => {
    host.shell.open();
    host.shell.close();

    expect(host.shell.isOpen()).toBe(false);
    expect(document.querySelector('.panel-content')).toBeNull();
  });

  it('toggle() flips between open and closed', () => {
    host.shell.toggle();
    expect(host.shell.isOpen()).toBe(true);

    host.shell.toggle();
    expect(host.shell.isOpen()).toBe(false);
  });

  it('is idempotent when open() is called while already open', () => {
    host.shell.open();
    host.shell.open();

    expect(document.querySelectorAll('.panel-content').length).toBe(1);
  });
});
