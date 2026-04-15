import { Directive, ElementRef, HostListener, Input, inject, Renderer2 } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';

@Directive({
  selector: '[appCopyClipboard]',
  standalone: true
})
export class CopyClipboardDirective {
  @Input('appCopyClipboard') textToCopy = '';

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private notifications = inject(NotificationService);

  @HostListener('click')
  async onClick(): Promise<void> {
    const text = this.textToCopy || this.el.nativeElement.textContent?.trim() || '';
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.notifications.show('Copied to clipboard.', 'success', 1500);
      this.flashFeedback();
    } catch {
      this.notifications.show('Copy failed.', 'error', 2000);
    }
  }

  private flashFeedback(): void {
    const el = this.el.nativeElement;
    this.renderer.setStyle(el, 'opacity', '0.5');
    this.renderer.setStyle(el, 'cursor', 'pointer');
    setTimeout(() => this.renderer.removeStyle(el, 'opacity'), 300);
  }
}
