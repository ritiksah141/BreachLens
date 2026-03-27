import { Component, Input } from '@angular/core';
import { NgClass, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-severity-badge',
  standalone: true,
  imports: [NgClass, UpperCasePipe],
  template: `
    <span class="badge" [ngClass]="badgeClass">{{ severity | uppercase }}</span>
  `,
})
export class SeverityBadgeComponent {
  @Input() severity = '';

  get badgeClass(): string {
    const map: Record<string, string> = {
      critical: 'bg-danger',
      high: 'bg-warning text-dark',
      medium: 'bg-primary',
      low: 'bg-success',
      informational: 'bg-secondary',
    };
    return map[this.severity?.toLowerCase()] ?? 'bg-secondary';
  }
}
