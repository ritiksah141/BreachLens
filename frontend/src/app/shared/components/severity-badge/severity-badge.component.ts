import { Component, Input } from '@angular/core';
import { NgClass, CommonModule } from '@angular/common';

@Component({
  selector: 'app-severity-badge',
  standalone: true,
  imports: [NgClass, CommonModule],
  template: `
    <span class="badge text-xs-caps py-1 px-2 border border-opacity-25" [ngClass]="badgeClass()">
      {{ severity | uppercase }}
    </span>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }

    .badge-critical { background-color: rgba(248, 113, 113, 0.1) !important; color: var(--tertiary-container) !important; border-color: var(--tertiary-container) !important; }
    .badge-high { background-color: rgba(251, 146, 60, 0.1) !important; color: #fb923c !important; border-color: #fb923c !important; }
    .badge-medium { background-color: rgba(251, 191, 36, 0.1) !important; color: #fbbf24 !important; border-color: #fbbf24 !important; }
    .badge-low { background-color: rgba(123, 208, 255, 0.1) !important; color: var(--primary) !important; border-color: var(--primary) !important; }
    .badge-informational { background-color: rgba(136, 146, 155, 0.1) !important; color: var(--on-surface-variant) !important; border-color: var(--outline) !important; }
  `]
})
export class SeverityBadgeComponent {
  @Input() severity = '';

  badgeClass(): string {
    const s = this.severity?.toLowerCase();
    if (s === 'critical') return 'badge-critical';
    if (s === 'high') return 'badge-high';
    if (s === 'medium') return 'badge-medium';
    if (s === 'low') return 'badge-low';
    return 'badge-informational';
  }
}
