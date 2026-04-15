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

    .badge-critical { background-color: var(--severity-critical-bg) !important; color: var(--severity-critical) !important; border-color: var(--severity-critical) !important; }
    .badge-high { background-color: var(--severity-high-bg) !important; color: var(--severity-high) !important; border-color: var(--severity-high) !important; }
    .badge-medium { background-color: var(--severity-medium-bg) !important; color: var(--severity-medium) !important; border-color: var(--severity-medium) !important; }
    .badge-low { background-color: var(--severity-low-bg) !important; color: var(--severity-low) !important; border-color: var(--severity-low) !important; }
    .badge-informational { background-color: var(--severity-info-bg) !important; color: var(--severity-info) !important; border-color: var(--severity-info) !important; }
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
