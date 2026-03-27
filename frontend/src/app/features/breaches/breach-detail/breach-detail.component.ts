import {
  Component, OnInit, OnDestroy, inject, Input, AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { BreachService } from '../../../core/services/breach.service';
import { AuthService } from '../../../core/services/auth.service';
import { Breach, TimelineEvent, RemediationAction, MonitoringAlert } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';

@Component({
  selector: 'app-breach-detail',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent],
  template: `
    <div class="mb-3">
      <a routerLink="/breaches" class="btn btn-sm btn-outline-secondary">← Back to list</a>
    </div>

    @if (loading) {
      <div class="text-center py-5">
        <div class="spinner-border text-danger"></div>
      </div>
    }

    @if (error) {
      <div class="alert alert-danger">{{ error }}</div>
    }

    @if (breach && !loading) {
      <!-- Header -->
      <div class="card bg-dark border-secondary mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
            <div class="d-flex gap-2 align-items-center">
              <app-severity-badge [severity]="breach.severity" />
              <span class="badge bg-secondary">{{ breach.status | titlecase }}</span>
              <span class="badge bg-secondary">{{ breach.industry }}</span>
            </div>
            @if (auth.isAnalyst()) {
              <a [routerLink]="['/admin']" [queryParams]="{edit: breach._id}" class="btn btn-sm btn-outline-warning">
                Edit breach
              </a>
            }
          </div>
          <h2 class="fw-bold text-light">{{ breach.title }}</h2>
          <p class="text-muted mb-3">{{ breach.description }}</p>

          <div class="row g-3">
            <div class="col-6 col-md-3">
              <div class="stat-box text-center p-3 rounded border border-secondary">
                <div class="fs-4 fw-bold text-danger">{{ breach.affected_records_count | number }}</div>
                <small class="text-muted">Records affected</small>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-box text-center p-3 rounded border border-secondary">
                <div class="fs-4 fw-bold" [ngClass]="riskClass(breach.risk_score)">
                  {{ breach.risk_score ?? 'N/A' }}
                </div>
                <small class="text-muted">Risk score</small>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-box text-center p-3 rounded border border-secondary">
                <div class="fs-6 fw-bold text-light">{{ breach.breach_date | date:'mediumDate' }}</div>
                <small class="text-muted">Breach date</small>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-box text-center p-3 rounded border border-secondary">
                <div class="fs-6 fw-bold text-light">{{ breach.discovered_date | date:'mediumDate' }}</div>
                <small class="text-muted">Discovered</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <!-- Left column -->
        <div class="col-lg-6">

          <!-- Map -->
          @if (breach.location?.coordinates) {
            <div class="card bg-dark border-secondary mb-4">
              <div class="card-header border-secondary">
                <strong class="text-light">📍 Location</strong>
              </div>
              <div class="card-body p-0">
                <div #mapContainer id="breach-map" style="height: 280px; border-radius: 0 0 0.375rem 0.375rem;"></div>
              </div>
            </div>
          }

          <!-- Details -->
          <div class="card bg-dark border-secondary mb-4">
            <div class="card-header border-secondary">
              <strong class="text-light">Details</strong>
            </div>
            <div class="card-body">
              <dl class="row mb-0 small">
                @if (breach.organisation) {
                  <dt class="col-sm-5 text-muted">Organisation</dt>
                  <dd class="col-sm-7 text-light">{{ breach.organisation }}</dd>
                }
                @if (breach.organisation_size) {
                  <dt class="col-sm-5 text-muted">Org size</dt>
                  <dd class="col-sm-7 text-light">{{ breach.organisation_size }}</dd>
                }
                @if (breach.attack_vector) {
                  <dt class="col-sm-5 text-muted">Attack vector</dt>
                  <dd class="col-sm-7 text-light">{{ breach.attack_vector }}</dd>
                }
                @if (breach.source_url) {
                  <dt class="col-sm-5 text-muted">Source</dt>
                  <dd class="col-sm-7">
                    <a [href]="breach.source_url" target="_blank" class="text-danger">
                      External link ↗
                    </a>
                  </dd>
                }
                @if (breach.data_types_exposed?.length) {
                  <dt class="col-sm-5 text-muted">Data exposed</dt>
                  <dd class="col-sm-7">
                    @for (dt of breach.data_types_exposed; track dt) {
                      <span class="badge bg-secondary me-1 mb-1">{{ dt }}</span>
                    }
                  </dd>
                }
              </dl>
            </div>
          </div>

          <!-- Monitoring alerts (auth only) -->
          @if (auth.isAuthenticated() && alerts.length) {
            <div class="card bg-dark border-secondary mb-4">
              <div class="card-header border-secondary d-flex justify-content-between">
                <strong class="text-light">Monitoring Alerts</strong>
                <span class="badge bg-danger">{{ alerts.length }}</span>
              </div>
              <ul class="list-group list-group-flush">
                @for (alert of alerts; track alert._id) {
                  <li class="list-group-item bg-dark border-secondary">
                    <div class="d-flex justify-content-between">
                      <span class="text-light small">{{ alert.message }}</span>
                      <span class="badge" [ngClass]="alert.acknowledged ? 'bg-success' : 'bg-warning text-dark'">
                        {{ alert.acknowledged ? 'Ack' : 'Open' }}
                      </span>
                    </div>
                    <small class="text-muted">{{ alert.alert_type }}</small>
                  </li>
                }
              </ul>
            </div>
          }

        </div>

        <!-- Right column -->
        <div class="col-lg-6">

          <!-- Timeline -->
          @if (auth.isAuthenticated()) {
            <div class="card bg-dark border-secondary mb-4">
              <div class="card-header border-secondary">
                <strong class="text-light">Timeline</strong>
              </div>
              <div class="card-body">
                @if (timeline.length === 0) {
                  <p class="text-muted small">No timeline events.</p>
                }
                <div class="timeline">
                  @for (event of timeline; track event._id) {
                    <div class="d-flex gap-3 mb-3">
                      <div class="flex-shrink-0">
                        <span class="badge rounded-pill bg-danger" style="width:10px;height:10px;padding:0;margin-top:6px;">&nbsp;</span>
                      </div>
                      <div>
                        <div class="fw-semibold text-light small">{{ event.event_type | titlecase }}</div>
                        <div class="text-muted small">{{ event.description }}</div>
                        <div class="text-muted" style="font-size:0.75rem">
                          {{ event.occurred_at | date:'medium' }}
                          @if (event.actor) { · {{ event.actor }} }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Remediation -->
          @if (auth.isAuthenticated()) {
            <div class="card bg-dark border-secondary mb-4">
              <div class="card-header border-secondary">
                <strong class="text-light">Remediation Actions</strong>
              </div>
              <ul class="list-group list-group-flush">
                @if (remediation.length === 0) {
                  <li class="list-group-item bg-dark text-muted small border-secondary">No actions recorded.</li>
                }
                @for (action of remediation; track action._id) {
                  <li class="list-group-item bg-dark border-secondary">
                    <div class="d-flex justify-content-between">
                      <span class="text-light small">{{ action.action }}</span>
                      <span
                        class="badge"
                        [ngClass]="{
                          'bg-success': action.status === 'completed',
                          'bg-warning text-dark': action.status === 'in_progress',
                          'bg-secondary': action.status === 'pending'
                        }"
                      >{{ action.status }}</span>
                    </div>
                    @if (action.assigned_to) {
                      <small class="text-muted">Assigned: {{ action.assigned_to }}</small>
                    }
                  </li>
                }
              </ul>
            </div>
          }

          @if (!auth.isAuthenticated()) {
            <div class="alert alert-secondary">
              <strong>Login</strong> to view timeline, remediation actions, monitoring alerts
              and affected accounts.
              <a routerLink="/auth/login" class="btn btn-sm btn-danger ms-2">Login</a>
            </div>
          }

        </div>
      </div>
    }
  `,
  styles: [`
    .stat-box { background: rgba(255,255,255,0.03); }
  `],
})
export class BreachDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() id = '';
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private breachService = inject(BreachService);
  auth = inject(AuthService);

  breach: Breach | null = null;
  timeline: TimelineEvent[] = [];
  remediation: RemediationAction[] = [];
  alerts: MonitoringAlert[] = [];
  loading = false;
  error = '';

  private map: any;
  private leafletLoaded = false;

  ngOnInit(): void {
    this.loadBreach();
  }

  ngAfterViewInit(): void {
    // Map is initialised once breach data is loaded (in loadBreach callback)
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  loadBreach(): void {
    this.loading = true;
    this.breachService.getBreach(this.id).subscribe({
      next: (res: any) => {
        this.breach = res.data;
        this.loading = false;
        // Load sub-documents if authenticated
        if (this.auth.isAuthenticated()) {
          this.loadSubDocuments();
        }
        // Initialise map after view has rendered
        setTimeout(() => this.initMap(), 100);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Breach not found.';
        this.loading = false;
      },
    });
  }

  private loadSubDocuments(): void {
    this.breachService.getTimeline(this.id).subscribe({
      next: (res: any) => (this.timeline = res.data ?? []),
    });
    this.breachService.getRemediation(this.id).subscribe({
      next: (res: any) => (this.remediation = res.data ?? []),
    });
    this.breachService.getAlerts(this.id).subscribe({
      next: (res: any) => (this.alerts = res.data ?? []),
    });
  }

  private async initMap(): Promise<void> {
    if (!this.breach?.location?.coordinates) return;
    if (!this.mapContainer?.nativeElement) return;

    // Dynamically import Leaflet (avoids SSR issues)
    const L = await import('leaflet' as any);

    const [lng, lat] = this.breach.location.coordinates;

    this.map = L.map(this.mapContainer.nativeElement).setView([lat, lng], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    const icon = L.divIcon({
      html: `<div style="background:#dc3545;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>`,
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    L.marker([lat, lng], { icon })
      .addTo(this.map)
      .bindPopup(`<strong>${this.breach.title}</strong><br/>${this.breach.organisation ?? ''}`)
      .openPopup();
  }

  riskClass(score?: number): string {
    if (!score) return 'text-muted';
    if (score >= 8) return 'text-danger';
    if (score >= 6) return 'text-warning';
    if (score >= 4) return 'text-primary';
    return 'text-success';
  }
}
