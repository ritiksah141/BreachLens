import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CopyClipboardDirective } from './copy-clipboard.directive';
import { NotificationService } from '../../core/services/notification.service';

// ── Test host component ────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [CopyClipboardDirective],
  template: `
    <button id="withInput" [appCopyClipboard]="'explicit text'">Button</button>
    <span id="fallback" appCopyClipboard>fallback content</span>
    <span id="empty" [appCopyClipboard]="''"></span>
  `,
})
class TestHostComponent {}

describe('CopyClipboardDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let clipboardWriteSpy: jasmine.Spy;

  beforeEach(async () => {
    notificationSpy = jasmine.createSpyObj('NotificationService', ['show']);

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    // Mock navigator.clipboard
    clipboardWriteSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteSpy },
      writable: true,
      configurable: true,
    });
  });

  function clickElement(id: string): void {
    const el = fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    el.click();
  }

  // ── copies explicit input text ────────────────────────────────────

  it('should copy the explicit input text on click', fakeAsync(() => {
    clickElement('withInput');
    tick();
    expect(clipboardWriteSpy).toHaveBeenCalledWith('explicit text');
    tick(300); // flush flashFeedback setTimeout
  }));

  it('should show a success notification after copying', fakeAsync(() => {
    clickElement('withInput');
    tick();
    expect(notificationSpy.show).toHaveBeenCalledWith('Copied to clipboard.', 'success', 1500);
    tick(300); // flush flashFeedback setTimeout
  }));

  // ── falls back to element textContent ─────────────────────────────

  it('should fall back to element textContent when input is empty', fakeAsync(() => {
    clickElement('fallback');
    tick();
    expect(clipboardWriteSpy).toHaveBeenCalledWith('fallback content');
    tick(300); // flush flashFeedback setTimeout
  }));

  // ── does nothing when both input and textContent are empty ────────

  it('should not call clipboard when text is empty', fakeAsync(() => {
    clickElement('empty');
    tick();
    expect(clipboardWriteSpy).not.toHaveBeenCalled();
  }));

  it('should not show notification when text is empty', fakeAsync(() => {
    clickElement('empty');
    tick();
    expect(notificationSpy.show).not.toHaveBeenCalled();
  }));

  // ── clipboard failure ─────────────────────────────────────────────

  it('should show error notification when clipboard write fails', fakeAsync(() => {
    clipboardWriteSpy.and.returnValue(Promise.reject(new Error('fail')));
    clickElement('withInput');
    tick();
    expect(notificationSpy.show).toHaveBeenCalledWith('Copy failed.', 'error', 2000);
  }));

  // ── visual feedback (opacity flash) ───────────────────────────────

  it('should set opacity to 0.5 after successful copy', fakeAsync(() => {
    clickElement('withInput');
    tick();
    const btn = fixture.nativeElement.querySelector('#withInput') as HTMLElement;
    expect(btn.style.opacity).toBe('0.5');
    tick(300); // flush flashFeedback setTimeout
  }));

  it('should remove opacity after 300ms', fakeAsync(() => {
    clickElement('withInput');
    tick();
    const btn = fixture.nativeElement.querySelector('#withInput') as HTMLElement;
    expect(btn.style.opacity).toBe('0.5');
    tick(300);
    expect(btn.style.opacity).toBe('');
  }));

  it('should set cursor to pointer during flash', fakeAsync(() => {
    clickElement('withInput');
    tick();
    const btn = fixture.nativeElement.querySelector('#withInput') as HTMLElement;
    expect(btn.style.cursor).toBe('pointer');
    tick(300); // flush flashFeedback setTimeout
  }));

  // ── does not flash on failure ─────────────────────────────────────

  it('should not change opacity on clipboard failure', fakeAsync(() => {
    clipboardWriteSpy.and.returnValue(Promise.reject(new Error('fail')));
    clickElement('withInput');
    tick();
    const btn = fixture.nativeElement.querySelector('#withInput') as HTMLElement;
    expect(btn.style.opacity).not.toBe('0.5');
  }));
});
