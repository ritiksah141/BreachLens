import {
  Component, OnInit, OnDestroy, inject, Input, AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, DecimalPipe, TitleCasePipe, CommonModule, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreachService } from '../../../core/services/breach.service';
import { AuthService } from '../../../core/services/auth.service';
import { Breach, TimelineEvent, RemediationAction, MonitoringAlert, AffectedAccount } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';

@Component({
  selector: 'app-breach-detail',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent, CommonModule, FormsModule, PercentPipe],
  template: `
    <div class="mb-3 d-flex justify-content-between align-items-center">
      <a routerLink="/breaches" class="btn btn-sm btn-outline-secondary">← Back to list</a>
      @if (auth.isAnalyst()) {
        <div class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-2">
          <span class="spinner-grow spinner-grow-sm me-1"></span> ANALYST ACCESS
        </div>
      }
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
      <div class="card bg-dark border-secondary mb-4 shadow-sm">
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
          @if (auth.isAuthenticated()) {
            <div class="card bg-dark border-secondary mb-4 shadow-sm">
              <div class="card-header border-secondary d-flex justify-content-between align-items-center">
                <strong class="text-light">Monitoring Alerts</strong>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-xs btn-outline-danger" (click)="showAddAlert = !showAddAlert">
                    {{ showAddAlert ? 'Cancel' : '+ Add' }}
                  </button>
                }
              </div>

              @if (showAddAlert) {
                <div class="card-body border-bottom border-secondary bg-black bg-opacity-25">
                  <div class="row g-2">
                    <div class="col-12">
                      <input [(ngModel)]="newAlert.message" class="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Alert message" />
                    </div>
                    <div class="col-md-6">
                      <select [(ngModel)]="newAlert.alert_type" class="form-select form-select-sm bg-dark text-light border-secondary">
                        <option value="data_exposure">Data Exposure</option>
                        <option value="credential_leak">Credential Leak</option>
                        <option value="domain_spoofing">Domain Spoofing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <select [(ngModel)]="newAlert.severity" class="form-select form-select-sm bg-dark text-light border-secondary">
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-sm btn-danger" (click)="addAlert()" [disabled]="!newAlert.message">Save Alert</button>
                    </div>
                  </div>
                </div>
              }

              <ul class="list-group list-group-flush">
                @if (alerts.length === 0) {
                  <li class="list-group-item bg-dark text-muted small border-secondary">No alerts.</li>
                }
                @for (alert of alerts; track alert._id) {
                  <li class="list-group-item bg-dark border-secondary">
                    <div class="d-flex justify-content-between">
                      <span class="text-light small">{{ alert.message }}</span>
                      <div class="d-flex gap-2">
                        @if (auth.isAnalyst()) {
                          <input type="checkbox" [checked]="alert.acknowledged" (change)="toggleAlertAck(alert)" class="form-check-input" title="Acknowledge" />
                        }
                        <span class="badge" [ngClass]="alert.acknowledged ? 'bg-success' : 'bg-warning text-dark'">
                          {{ alert.acknowledged ? 'Ack' : 'Open' }}
                        </span>
                        @if (auth.isAdmin()) {
                          <button class="btn btn-xs btn-link text-danger p-0 ms-1" (click)="deleteAlert(alert._id!)">✕</button>
                        }
                      </div>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                      <small class="text-muted">{{ alert.alert_type | titlecase }} · {{ alert.severity | titlecase }}</small>
                      @if (alert.created_at) {
                        <small class="text-muted" style="font-size: 0.7rem;">{{ alert.created_at | date:'short' }}</small>
                      }
                    </div>
                  </li>
                }
              </ul>
            </div>
          }

          <!-- Affected Accounts (auth only) -->
          @if (auth.isAuthenticated()) {
            <div class="card bg-dark border-secondary mb-4 shadow-sm">
              <div class="card-header border-secondary d-flex justify-content-between align-items-center">
                <strong class="text-light">Affected Accounts</strong>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-xs btn-outline-danger" (click)="showAddAccount = !showAddAccount">
                    {{ showAddAccount ? 'Cancel' : '+ Add' }}
                  </button>
                }
              </div>

              @if (showAddAccount) {
                <div class="card-body border-bottom border-secondary bg-black bg-opacity-25">
                  <div class="row g-2">
                    <div class="col-md-6">
                      <input [(ngModel)]="newAccount.email" class="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Email (optional)" />
                    </div>
                    <div class="col-md-6">
                      <input [(ngModel)]="newAccount.username" class="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Username (optional)" />
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-sm btn-danger" (click)="addAccount()" [disabled]="!newAccount.email && !newAccount.username">Save Account</button>
                    </div>
                  </div>
                </div>
              }

              <div class="table-responsive">
                <table class="table table-dark table-hover mb-0 small">
                  <thead>
                    <tr class="text-muted" style="font-size: 0.7rem;">
                      <th>Email/User</th>
                      <th class="text-center">Notified</th>
                      @if (auth.isAdmin()) { <th class="text-end">Action</th> }
                    </tr>
                  </thead>
                  <tbody>
                    @if (accounts.length === 0) {
                      <tr><td colspan="3" class="text-center text-muted py-3">No account data.</td></tr>
                    }
                    @for (acc of accounts; track acc._id) {
                      <tr>
                        <td>
                          <div class="text-light">{{ acc.email || acc.username }}</div>
                          <div class="text-muted" style="font-size: 0.65rem;">{{ acc.data_types_exposed?.join(', ') }}</div>
                        </td>
                        <td class="text-center">
                          <input type="checkbox" [checked]="acc.notified" (change)="toggleAccountNotified(acc)" [disabled]="!auth.isAnalyst()" class="form-check-input" />
                        </td>
                        @if (auth.isAdmin()) {
                          <td class="text-end">
                            <button class="btn btn-xs btn-link text-danger p-0" (click)="deleteAccount(acc._id!)">✕</button>
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

        </div>

        <!-- Right column -->
        <div class="col-lg-6">

          <!-- Timeline -->
          @if (auth.isAuthenticated()) {
            <div class="card bg-dark border-secondary mb-4 shadow-sm">
              <div class="card-header border-secondary d-flex justify-content-between align-items-center">
                <strong class="text-light">Timeline</strong>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-xs btn-outline-danger" (click)="showAddTimeline = !showAddTimeline">
                    {{ showAddTimeline ? 'Cancel' : '+ Add' }}
                  </button>
                }
              </div>

              @if (showAddTimeline) {
                <div class="card-body border-bottom border-secondary bg-black bg-opacity-25">
                  <div class="row g-2">
                    <div class="col-md-6">
                      <input [(ngModel)]="newEvent.event_type" class="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Event type (e.g. Discovery)" />
                    </div>
                    <div class="col-md-6">
                      <input type="datetime-local" [(ngModel)]="newEvent.occurred_at" class="form-control form-control-sm bg-dark text-light border-secondary" />
                    </div>
                    <div class="col-12">
                      <textarea [(ngModel)]="newEvent.description" class="form-control form-control-sm bg-dark text-light border-secondary" rows="2" placeholder="Description"></textarea>
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-sm btn-danger" (click)="addTimeline()" [disabled]="!newEvent.event_type || !newEvent.description">Save Event</button>
                    </div>
                  </div>
                </div>
              }

              <div class="card-body">
                @if (timeline.length === 0) {
                  <p class="text-muted small mb-0">No timeline events.</p>
                }
                <div class="timeline">
                  @for (event of timeline; track event._id) {
                    <div class="d-flex gap-3 mb-3 position-relative">
                      <div class="flex-shrink-0">
                        <span class="badge rounded-pill bg-danger" style="width:10px;height:10px;padding:0;margin-top:6px;">&nbsp;</span>
                      </div>
                      <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                          <div class="fw-semibold text-light small">{{ event.event_type | titlecase }}</div>
                          @if (auth.isAdmin()) {
                            <button class="btn btn-xs btn-link text-danger p-0" (click)="deleteTimeline(event._id!)">✕</button>
                          }
                        </div>
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
            <div class="card bg-dark border-secondary mb-4 shadow-sm">
              <div class="card-header border-secondary d-flex justify-content-between align-items-center">
                <strong class="text-light">Remediation Actions</strong>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-xs btn-outline-danger" (click)="showAddRemediation = !showAddRemediation">
                    {{ showAddRemediation ? 'Cancel' : '+ Add' }}
                  </button>
                }
              </div>

              @if (showAddRemediation) {
                <div class="card-body border-bottom border-secondary bg-black bg-opacity-25">
                  <div class="row g-2">
                    <div class="col-12">
                      <input [(ngModel)]="newAction.action" class="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Action description" />
                    </div>
                    <div class="col-md-6">
                      <select [(ngModel)]="newAction.status" class="form-select form-select-sm bg-dark text-light border-secondary">
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <input [(ngModel)]="newAction.assigned_to" class="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Assigned to" />
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-sm btn-danger" (click)="addRemediation()" [disabled]="!newAction.action">Save Action</button>
                    </div>
                  </div>
                </div>
              }

              <ul class="list-group list-group-flush">
                @if (remediation.length === 0) {
                  <li class="list-group-item bg-dark text-muted small border-secondary">No actions recorded.</li>
                }
                @for (action of remediation; track action._id) {
                  <li class="list-group-item bg-dark border-secondary">
                    <div class="d-flex justify-content-between align-items-start">
                      <div class="flex-grow-1">
                        <div class="d-flex justify-content-between">
                          <span class="text-light small">{{ action.action }}</span>
                          <div class="d-flex gap-2 align-items-center">
                            @if (auth.isAnalyst()) {
                              <select
                                [ngModel]="action.status"
                                (change)="updateRemediationStatus(action, $event)"
                                class="form-select form-select-xs bg-dark text-light border-secondary p-0 px-1"
                                style="font-size: 0.7rem; height: auto;"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            }
                            <span
                              class="badge"
                              [ngClass]="{
                                'bg-success': action.status === 'completed',
                                'bg-warning text-dark': action.status === 'in_progress',
                                'bg-secondary': action.status === 'pending'
                              }"
                            >{{ action.status }}</span>
                            @if (auth.isAdmin()) {
                              <button class="btn btn-xs btn-link text-danger p-0" (click)="deleteRemediation(action._id!)">✕</button>
                            }
                          </div>
                        </div>
                        @if (action.assigned_to) {
                          <small class="text-muted">Assigned: {{ action.assigned_to }}</small>
                        }
                      </div>
                    </div>
                  </li>
                }
              </ul>
            </div>
          }

          @if (!auth.isAuthenticated()) {
            <div class="alert alert-secondary border-secondary">
              <strong class="text-light">Login</strong> to view timeline, remediation actions, monitoring alerts
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
    .btn-xs { padding: 0.125rem 0.25rem; font-size: 0.75rem; }
    .form-select-xs { height: 1.5rem; padding-top: 0; padding-bottom: 0; }
    .table-dark { --bs-table-bg: transparent; }
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
  accounts: AffectedAccount[] = [];
  loading = false;
  error = '';

  // UI State for forms
  showAddTimeline = false;
  newEvent: Partial<TimelineEvent> = { event_type: '', description: '', occurred_at: new Date().toISOString().slice(0, 16) };

  showAddRemediation = false;
  newAction: Partial<RemediationAction> = { action: '', status: 'pending', assigned_to: '' };

  showAddAlert = false;
  newAlert: Partial<MonitoringAlert> = { message: '', alert_type: 'data_exposure', severity: 'medium', acknowledged: false };

  showAddAccount = false;
  newAccount: Partial<AffectedAccount> = { email: '', username: '', notified: false };

  private map: any;

  ngOnInit(): void {
    this.loadBreach();
  }

  ngAfterViewInit(): void {
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
        if (this.auth.isAuthenticated()) {
          this.loadSubDocuments();
        }
        setTimeout(() => this.initMap(), 100);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Breach not found.';
        this.loading = false;
      },
    });
  }

  loadSubDocuments(): void {
    this.breachService.getTimeline(this.id).subscribe({
      next: (res: any) => (this.timeline = res.data ?? []),
    });
    this.breachService.getRemediation(this.id).subscribe({
      next: (res: any) => (this.remediation = res.data ?? []),
    });
    this.breachService.getAlerts(this.id).subscribe({
      next: (res: any) => (this.alerts = res.data ?? []),
    });
    if (this.auth.isAnalyst()) {
      this.breachService.getAffectedAccounts(this.id).subscribe({
        next: (res: any) => (this.accounts = res.data ?? []),
      });
    }
  }

  // Management Actions
  addTimeline(): void {
    this.breachService.addTimelineEvent(this.id, this.newEvent).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddTimeline = false;
        this.newEvent = { event_type: '', description: '', occurred_at: new Date().toISOString().slice(0, 16) };
      }
    });
  }

  deleteTimeline(eventId: string): void {
    if (!confirm('Delete this timeline event?')) return;
    this.breachService.deleteTimelineEvent(this.id, eventId).subscribe({
      next: () => this.loadSubDocuments()
    });
  }

  addRemediation(): void {
    this.breachService.addRemediation(this.id, this.newAction).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddRemediation = false;
        this.newAction = { action: '', status: 'pending', assigned_to: '' };
      }
    });
  }

  updateRemediationStatus(action: RemediationAction, event: any): void {
    const newStatus = event.target.value;
    this.breachService.updateRemediation(this.id, action._id!, { status: newStatus }).subscribe({
      next: () => this.loadSubDocuments()
    });
  }

  deleteRemediation(actionId: string): void {
    if (!confirm('Delete this remediation action?')) return;
    this.breachService.deleteRemediation(this.id, actionId).subscribe({
      next: () => this.loadSubDocuments()
    });
  }

  addAlert(): void {
    this.breachService.addAlert(this.id, this.newAlert).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddAlert = false;
        this.newAlert = { message: '', alert_type: 'data_exposure', severity: 'medium', acknowledged: false };
      }
    });
  }

  toggleAlertAck(alert: MonitoringAlert): void {
    this.breachService.updateAlert(this.id, alert._id!, { acknowledged: !alert.acknowledged }).subscribe({
      next: () => this.loadSubDocuments()
    });
  }

  deleteAlert(alertId: string): void {
    if (!confirm('Delete this monitoring alert?')) return;
    this.breachService.deleteAlert(this.id, alertId).subscribe({
      next: () => this.loadSubDocuments()
    });
  }

  addAccount(): void {
    this.breachService.addAffectedAccount(this.id, this.newAccount).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddAccount = false;
        this.newAccount = { email: '', username: '', notified: false };
      }
    });
  }

  toggleAccountNotified(acc: AffectedAccount): void {
    this.breachService.updateAffectedAccount(this.id, acc._id!, { notified: !acc.notified }).subscribe({
      next: () => this.loadSubDocuments()
    });
  }

  deleteAccount(accId: string): void {
    if (!confirm('Remove this account record?')) return;
    this.breachService.deleteAffectedAccount(this.id, accId).subscribe({
      next: () => this.loadSubDocuments()
    });
  }

  private async initMap(): Promise<void> {
    if (!this.breach?.location?.coordinates) return;
    if (!this.mapContainer?.nativeElement) return;

    const L = await import('leaflet' as any);
    const [lng, lat] = this.breach.location.coordinates;
    if (this.map) this.map.remove();

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
