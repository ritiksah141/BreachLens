import {
  Component, OnInit, OnDestroy, inject, Input, AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, DecimalPipe, TitleCasePipe, CommonModule, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreachService } from '../../../core/services/breach.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Breach, TimelineEvent, RemediationAction, MonitoringAlert, AffectedAccount } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';

@Component({
  selector: 'app-breach-detail',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent, CommonModule, FormsModule, PercentPipe],
  template: `
    <div class="mb-4 d-flex justify-content-between align-items-center mt-2">
      <a routerLink="/breaches" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 shadow-sm d-flex align-items-center gap-2">
        <span class="material-symbols-outlined fs-6">arrow_back</span> Return_to_Log
      </a>
      @if (auth.isAnalyst()) {
        <div class="badge py-2 px-3 glass-panel border border-tertiary border-opacity-25 text-tertiary text-xs-caps glow-error">
          <span class="p-1 bg-tertiary rounded-circle animate-pulse me-2"></span> ANALYST_ACCESS_ENABLED
        </div>
      }
    </div>

    @if (loading) {
      <div class="text-center py-5 glass-panel rounded-3 border border-outline-variant border-opacity-10">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-on-surface-variant text-xs-caps mt-3">Fetching intelligence packet...</p>
      </div>
    }

    @if (error) {
      <div class="alert bg-error-container bg-opacity-10 border-error text-error p-4 rounded-3 text-xs-caps shadow-lg">
        <span class="material-symbols-outlined fs-4 me-2">warning</span> {{ error }}
      </div>
    }

    @if (breach && !loading) {
      <!-- Bento Header -->
      <div class="row g-4 mb-4">
        <!-- Event Identity Card -->
        <div class="col-lg-8">
          <div class="card border-0 bg-surface-container shadow-lg h-100 position-relative overflow-hidden">
            <div class="position-absolute top-0 end-0 p-3 opacity-10">
              <span class="material-symbols-outlined fs-1">security</span>
            </div>
            <div class="card-body p-4 p-md-5">
              <div class="d-flex justify-content-between flex-wrap gap-3 mb-4">
                <div class="d-flex gap-2 align-items-center">
                  <app-severity-badge [severity]="breach.severity" />
                  <span class="badge py-2 px-3 glass-panel border border-outline-variant border-opacity-25 text-on-surface-variant text-xs-caps">{{ breach.status | uppercase }}</span>
                  <span class="badge py-2 px-3 glass-panel border border-outline-variant border-opacity-25 text-on-surface-variant text-xs-caps">{{ breach.industry | uppercase }}</span>
                </div>
                @if (auth.isAnalyst()) {
                  <a [routerLink]="['/admin']" [queryParams]="{edit: breach._id}" class="btn btn-primary text-xs-caps py-2 px-4 shadow-sm">
                    MODIFY_RECORD
                  </a>
                }
              </div>
              <h2 class="font-headline fw-extrabold text-on-surface tracking-tight mb-2 fs-1">{{ breach.title }}</h2>
              <p class="text-on-surface-variant lead mb-5" style="max-width: 800px;">{{ breach.description }}</p>

              <div class="row g-4 mt-auto">
                <div class="col-6 col-md-3">
                  <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 text-center h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">RECORDS_COMPROMISED</div>
                    <div class="fs-4 fw-bold text-on-surface font-headline">{{ breach.affected_records_count | number }}</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 text-center h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">RISK_INDEX_V2</div>
                    <div class="fs-4 fw-bold font-headline" [ngClass]="riskColor(breach.risk_score)">
                      {{ (breach.risk_score ?? 0) | number:'1.1-1' }}
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 text-center h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">EVENT_TIMESTAMP</div>
                    <div class="fs-6 fw-bold text-on-surface">{{ breach.breach_date | date:'MMM dd, yyyy' }}</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 text-center h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">DETECTION_LAG</div>
                    <div class="fs-6 fw-bold text-on-surface">{{ detectionLag }} DAYS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Geospatial Context Card -->
        <div class="col-lg-4">
          <div class="card border-0 bg-surface-container shadow-lg h-100 overflow-hidden">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-high">
              <span class="text-xs-caps text-on-surface">Geospatial_Origin</span>
              <span class="material-symbols-outlined fs-6 text-on-surface-variant">location_on</span>
            </div>
            <div class="card-body p-0 position-relative">
              @if (breach.location?.coordinates) {
                <div #mapContainer id="breach-map" style="height: 100%; min-height: 350px;"></div>
              } @else {
                <div class="d-flex flex-column align-items-center justify-content-center h-100 p-5 text-center opacity-25">
                  <span class="material-symbols-outlined fs-1 mb-2">map_off</span>
                  <div class="text-xs-caps">Coordinates_Unavailable</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <!-- Metadata & Affected Assets -->
        <div class="col-lg-5">
          <!-- Intelligence Parameters -->
          <div class="card border-0 bg-surface-container-low shadow-lg mb-4 overflow-hidden">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container">
              <span class="text-xs-caps text-on-surface">Intelligence_Parameters</span>
              <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">ID: {{ (breach._id).slice(-12) | uppercase }}</span>
            </div>
            <div class="card-body p-4">
              <div class="d-flex flex-column gap-3">
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-outline-variant border-opacity-10">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 9px;">Target_Organisation</span>
                  <span class="fw-bold text-on-surface small">{{ breach.organisation || 'UNSPECIFIED' }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-outline-variant border-opacity-10">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 9px;">Org_Complexity</span>
                  <span class="fw-bold text-on-surface small">{{ breach.organisation_size || 'UNKNOWN' }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-outline-variant border-opacity-10">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 9px;">Incursion_Vector</span>
                  <span class="fw-bold text-on-surface small">{{ breach.attack_vector || 'UNKNOWN' | uppercase }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-outline-variant border-opacity-10" *ngIf="breach.source_url">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 9px;">Source_Intel_Link</span>
                  <a [href]="breach.source_url" target="_blank" class="text-primary text-decoration-none fw-bold small">EXTERNAL_INTEL ↗</a>
                </div>
                <div class="mt-2">
                  <span class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 9px;">Exposed_Data_Clusters</span>
                  <div class="d-flex flex-wrap gap-2">
                    @for (dt of breach.data_types_exposed; track dt) {
                      <span class="badge py-1 px-2 glass-panel border border-outline-variant border-opacity-25 text-on-surface text-xs-caps" style="font-size: 7px;">{{ dt }}</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Monitoring Alerts (auth only) -->
          @if (auth.isAuthenticated()) {
            <div class="card border-0 bg-surface-container-low shadow-lg mb-4 overflow-hidden">
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container">
                <span class="text-xs-caps text-on-surface">Surveillance_Alerts</span>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2" style="font-size: 8px;" (click)="showAddAlert = !showAddAlert">
                    {{ showAddAlert ? 'CANCEL' : '+ ADD_ALERT' }}
                  </button>
                }
              </div>

              @if (showAddAlert) {
                <div class="card-body border-bottom border-outline-variant border-opacity-10 bg-surface-container-high">
                  <div class="row g-3">
                    <div class="col-12">
                      <input [(ngModel)]="newAlert.message" class="form-control bg-surface-container-low border-0 text-xs-caps" placeholder="ALERT_MESSAGE..." style="font-size: 10px;" />
                    </div>
                    <div class="col-md-6">
                      <select [(ngModel)]="newAlert.alert_type" class="form-select bg-surface-container-low border-0 text-xs-caps" style="font-size: 10px;">
                        <option value="data_exposure">DATA_EXPOSURE</option>
                        <option value="credential_leak">CREDENTIAL_LEAK</option>
                        <option value="domain_spoofing">DOMAIN_SPOOFING</option>
                        <option value="other">OTHER</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <select [(ngModel)]="newAlert.severity" class="form-select bg-surface-container-low border-0 text-xs-caps" style="font-size: 10px;">
                        <option value="critical">CRITICAL</option>
                        <option value="high">HIGH</option>
                        <option value="medium">MEDIUM</option>
                        <option value="low">LOW</option>
                      </select>
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-primary text-xs-caps py-1 px-3" (click)="addAlert()" [disabled]="!newAlert.message" style="font-size: 9px;">COMMIT_ALERT</button>
                    </div>
                  </div>
                </div>
              }

              <div class="p-0 overflow-auto" style="max-height: 400px;">
                <ul class="list-group list-group-flush">
                  @if (alerts.length === 0) {
                    <li class="list-group-item bg-transparent text-on-surface-variant small text-center py-4 opacity-50">NO_ACTIVE_ALERTS</li>
                  }
                  @for (alert of alerts; track alert._id) {
                    <li class="list-group-item bg-transparent border-outline-variant border-opacity-10 p-3">
                      <div class="d-flex justify-content-between mb-2">
                        <span class="text-on-surface small fw-bold">{{ alert.message }}</span>
                        <div class="d-flex gap-2 align-items-center">
                          @if (auth.isAnalyst()) {
                            <input type="checkbox" [checked]="alert.acknowledged" (change)="toggleAlertAck(alert)" class="form-check-input bg-surface-container border-outline-variant" />
                          }
                          <span class="badge text-xs-caps py-1 px-2" [ngClass]="alert.acknowledged ? 'bg-success text-success-container' : 'bg-tertiary-container text-on-tertiary-container'" style="font-size: 7px;">
                            {{ alert.acknowledged ? 'ACK' : 'OPEN' }}
                          </span>
                          @if (auth.isAdmin()) {
                            <button class="btn btn-link p-0 text-on-surface-variant hover-text-error border-0" (click)="deleteAlert(alert._id!)">
                              <span class="material-symbols-outlined fs-6">close</span>
                            </button>
                          }
                        </div>
                      </div>
                      <div class="d-flex justify-content-between align-items-center opacity-50">
                        <span class="text-xs-caps" style="font-size: 8px;">{{ alert.alert_type | uppercase }} // {{ alert.severity | uppercase }}</span>
                        @if (alert.created_at) {
                          <span class="text-xs-caps font-mono" style="font-size: 8px;">{{ alert.created_at | date:'short' }}</span>
                        }
                      </div>
                    </li>
                  }
                </ul>
              </div>
            </div>
          }
        </div>

        <!-- Timeline & Mitigation -->
        <div class="col-lg-7">
          <!-- Timeline -->
          @if (auth.isAuthenticated()) {
            <div class="card border-0 bg-surface-container-low shadow-lg mb-4 overflow-hidden">
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container">
                <span class="text-xs-caps text-on-surface">Event_Incident_Timeline</span>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2" style="font-size: 8px;" (click)="showAddTimeline = !showAddTimeline">
                    {{ showAddTimeline ? 'CANCEL' : '+ ADD_EVENT' }}
                  </button>
                }
              </div>

              @if (showAddTimeline) {
                <div class="card-body border-bottom border-outline-variant border-opacity-10 bg-surface-container-high">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <input [(ngModel)]="newEvent.event_type" class="form-control bg-surface-container-low border-0 text-xs-caps" placeholder="EVENT_TYPE..." style="font-size: 10px;" />
                    </div>
                    <div class="col-md-6">
                      <input type="datetime-local" [(ngModel)]="newEvent.occurred_at" class="form-control bg-surface-container-low border-0 text-xs-caps text-on-surface" style="font-size: 10px;" />
                    </div>
                    <div class="col-12">
                      <textarea [(ngModel)]="newEvent.description" class="form-control bg-surface-container-low border-0 text-xs-caps" rows="2" placeholder="EVENT_DESCRIPTION..." style="font-size: 10px;"></textarea>
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-primary text-xs-caps py-1 px-3" (click)="addTimeline()" [disabled]="!newEvent.event_type || !newEvent.description" style="font-size: 9px;">COMMIT_EVENT</button>
                    </div>
                  </div>
                </div>
              }

              <div class="card-body p-4">
                @if (timeline.length === 0) {
                  <p class="text-on-surface-variant small text-center py-4 opacity-50 text-xs-caps">NO_TIMELINE_DATA</p>
                }
                <div class="position-relative ps-4 ms-2 border-start border-outline-variant border-opacity-25 py-2">
                  @for (event of timeline; track event._id) {
                    <div class="mb-5 position-relative">
                      <div class="position-absolute top-0 start-0 translate-middle p-1 bg-primary rounded-circle border border-4 border-dark" style="left: -17px; margin-top: 8px;"></div>
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="text-xs-caps text-primary fw-bold">{{ event.event_type | uppercase }}</div>
                        <div class="d-flex gap-2 align-items-center">
                          <span class="text-xs-caps font-mono opacity-50" style="font-size: 8px;">{{ event.occurred_at | date:'yyyy-MM-dd || HH:mm' }}</span>
                          @if (auth.isAdmin()) {
                            <button class="btn btn-link p-0 text-on-surface-variant hover-text-error border-0" (click)="deleteTimeline(event._id!)">
                              <span class="material-symbols-outlined fs-6">close</span>
                            </button>
                          }
                        </div>
                      </div>
                      <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10">
                        <p class="text-on-surface-variant small mb-0">{{ event.description }}</p>
                        @if (event.actor) {
                          <div class="mt-2 text-xs-caps opacity-50" style="font-size: 7px;">OPERATOR: {{ event.actor | uppercase }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Remediation -->
          @if (auth.isAuthenticated()) {
            <div class="card border-0 bg-surface-container-low shadow-lg overflow-hidden">
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container">
                <span class="text-xs-caps text-on-surface">Mitigation_Protocols</span>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2" style="font-size: 8px;" (click)="showAddRemediation = !showAddRemediation">
                    {{ showAddRemediation ? 'CANCEL' : '+ ADD_PROTOCOL' }}
                  </button>
                }
              </div>

              @if (showAddRemediation) {
                <div class="card-body border-bottom border-outline-variant border-opacity-10 bg-surface-container-high">
                  <div class="row g-3">
                    <div class="col-12">
                      <input [(ngModel)]="newAction.action" class="form-control bg-surface-container-low border-0 text-xs-caps" placeholder="MITIGATION_ACTION..." style="font-size: 10px;" />
                    </div>
                    <div class="col-md-6">
                      <select [(ngModel)]="newAction.status" class="form-select bg-surface-container-low border-0 text-xs-caps" style="font-size: 10px;">
                        <option value="pending">PENDING</option>
                        <option value="in_progress">IN_PROGRESS</option>
                        <option value="completed">COMPLETED</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <input [(ngModel)]="newAction.assigned_to" class="form-control bg-surface-container-low border-0 text-xs-caps" placeholder="ASSIGNED_OPERATOR..." style="font-size: 10px;" />
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-primary text-xs-caps py-1 px-3" (click)="addRemediation()" [disabled]="!newAction.action" style="font-size: 9px;">COMMIT_PROTOCOL</button>
                    </div>
                  </div>
                </div>
              }

              <div class="p-0">
                <ul class="list-group list-group-flush">
                  @if (remediation.length === 0) {
                    <li class="list-group-item bg-transparent text-on-surface-variant small text-center py-4 opacity-50 text-xs-caps">NO_ACTIVE_PROTOCOLS</li>
                  }
                  @for (action of remediation; track action._id) {
                    <li class="list-group-item bg-transparent border-outline-variant border-opacity-10 p-3">
                      <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                          <div class="d-flex justify-content-between mb-2">
                            <span class="text-on-surface small fw-bold">{{ action.action }}</span>
                            <div class="d-flex gap-2 align-items-center">
                              @if (auth.isAnalyst()) {
                                <select
                                  [ngModel]="action.status"
                                  (change)="updateRemediationStatus(action, $event)"
                                  class="form-select bg-surface-container border-0 text-xs-caps py-0 px-2"
                                  style="font-size: 8px; height: 24px; width: auto;"
                                >
                                  <option value="pending">PENDING</option>
                                  <option value="in_progress">IN_PROGRESS</option>
                                  <option value="completed">COMPLETED</option>
                                </select>
                              }
                              <span
                                class="badge text-xs-caps py-1 px-2"
                                [ngClass]="{
                                  'bg-success text-success-container': action.status === 'completed',
                                  'bg-warning text-dark': action.status === 'in_progress',
                                  'bg-surface-container-highest text-on-surface-variant': action.status === 'pending'
                                }"
                                style="font-size: 7px;"
                              >{{ action.status | uppercase }}</span>
                              @if (auth.isAdmin()) {
                                <button class="btn btn-link p-0 text-on-surface-variant hover-text-error border-0" (click)="deleteRemediation(action._id!)">
                                  <span class="material-symbols-outlined fs-6">close</span>
                                </button>
                              }
                            </div>
                          </div>
                          @if (action.assigned_to) {
                            <div class="text-xs-caps text-on-surface-variant opacity-50" style="font-size: 8px;">OPERATOR_ASSIGNED: {{ action.assigned_to | uppercase }}</div>
                          }
                        </div>
                      </div>
                    </li>
                  }
                </ul>
              </div>
            </div>
          }

          @if (!auth.isAuthenticated()) {
            <div class="card border-0 bg-surface-container-low shadow-lg p-4 mt-4 text-center">
              <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 mb-3">
                <span class="material-symbols-outlined fs-1 text-primary mb-2">lock</span>
                <h4 class="text-xs-caps text-on-surface">Secure_Access_Required</h4>
                <p class="text-on-surface-variant small mb-0">Full intelligence timeline and mitigation protocols require authorization.</p>
              </div>
              <a routerLink="/auth/login" class="btn btn-primary text-xs-caps py-2 w-100 mt-2">AUTHORIZE_SESSION</a>
            </div>
          }
        </div>
      </div>
    }
    <div class="pb-5"></div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .glow-primary { box-shadow: 0 0 20px rgba(0, 167, 224, 0.15); }
    .glow-error { box-shadow: 0 0 20px rgba(248, 113, 113, 0.15); }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
    .bg-success-container { background-color: #0a1a10; }
    .text-success-container { color: #4ade80; }
  `],
})
export class BreachDetailComponent implements OnInit, OnDestroy {
  @Input() id = '';
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private breachService = inject(BreachService);
  private themeService = inject(ThemeService);
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

  get detectionLag(): number {
    if (!this.breach?.breach_date || !this.breach?.discovered_date) return 0;
    const start = new Date(this.breach.breach_date);
    const end = new Date(this.breach.discovered_date);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  ngOnInit(): void {
    this.loadBreach();
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

    const isDark = this.themeService.theme() === 'dark';
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    const color = this.severityMapColor(this.breach.severity);
    const icon = L.divIcon({
      html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow: 0 0 10px ${color}80;"></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([lat, lng], { icon })
      .addTo(this.map)
      .bindPopup(`
        <div class="text-on-surface">
          <div class="text-xs-caps fw-bold mb-1" style="font-size: 10px;">${this.breach.title}</div>
          <div class="text-xs-caps text-on-surface-variant mb-0" style="font-size: 8px;">${this.breach.organisation || 'UNSPECIFIED'}</div>
        </div>
      `, { className: 'bl-popup' })
      .openPopup();
  }

  riskColor(score?: number): string {
    if (!score) return 'text-on-surface-variant opacity-50';
    if (score >= 8) return 'text-error';
    if (score >= 6) return 'text-warning';
    if (score >= 4) return 'text-primary';
    return 'text-success';
  }

  severityMapColor(s?: string): string {
    const map: any = { critical: '#ffb3b0', high: '#fb923c', medium: '#fbbf24', low: '#7bd0ff' };
    return map[s?.toLowerCase() || ''] || '#88929b';
  }
}
