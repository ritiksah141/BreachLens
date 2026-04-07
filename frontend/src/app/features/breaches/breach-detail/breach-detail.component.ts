import {
  Component, OnInit, OnDestroy, inject, Input, AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, DecimalPipe, TitleCasePipe, CommonModule, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreachService } from '../../../core/services/breach.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Breach, TimelineEvent, RemediationAction, MonitoringAlert, AffectedAccount } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';

@Component({
  selector: 'app-breach-detail',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent, CommonModule, FormsModule, PercentPipe],
  template: `
    <div class="mb-4 d-flex justify-content-between align-items-center mt-2">
      <a routerLink="/breaches" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 shadow-sm d-flex align-items-center gap-2">
        <span class="material-symbols-outlined fs-6">arrow_back</span> Back to breach log
      </a>
      @if (auth.isAnalyst()) {
        <div class="badge py-2 px-3 glass-panel border border-tertiary border-opacity-25 text-tertiary text-xs-caps glow-error">
          <span class="p-1 bg-tertiary rounded-circle animate-pulse me-2"></span> Analyst access enabled
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
                    Edit record
                  </a>
                }
              </div>
              <h2 class="font-headline fw-extrabold text-on-surface tracking-tight mb-2 fs-1">{{ breach.title }}</h2>
              <p class="text-on-surface-variant lead mb-5" style="max-width: 800px;">{{ breach.description }}</p>

              <div class="row g-4 mt-auto">
                <div class="col-6 col-md-3">
                  <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 text-center h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Records compromised</div>
                    <div class="fs-4 fw-bold text-on-surface font-headline">{{ breach.affected_records_count | number }}</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 text-center h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Risk score</div>
                    <div class="fs-4 fw-bold font-headline" [ngClass]="riskColor(breach.risk_score)">
                      {{ (breach.risk_score ?? 0) | number:'1.1-1' }}
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 text-center h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Event date</div>
                    <div class="fs-6 fw-bold text-on-surface">{{ breach.breach_date | date:'MMM dd, yyyy' }}</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10 text-center h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Detection lag</div>
                    <div class="fs-6 fw-bold text-on-surface">{{ detectionLag }} days</div>
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
              <span class="text-xs-caps text-on-surface">Geospatial origin</span>
              <span class="material-symbols-outlined fs-6 text-on-surface-variant">location_on</span>
            </div>
            <div class="card-body p-0 position-relative">
              @if (breach.location?.coordinates) {
                <div #mapContainer id="breach-map" style="height: 100%; min-height: 350px;"></div>
              } @else {
                <div class="d-flex flex-column align-items-center justify-content-center h-100 p-5 text-center opacity-25">
                  <span class="material-symbols-outlined fs-1 mb-2">map_off</span>
                  <div class="text-xs-caps">Coordinates unavailable</div>
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
              <span class="text-xs-caps text-on-surface">Intelligence parameters</span>
              <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">ID: {{ (breach._id).slice(-12) | uppercase }}</span>
            </div>
            <div class="card-body p-4">
              <div class="d-flex flex-column gap-3">
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-outline-variant border-opacity-10">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 9px;">Target organisation</span>
                  <span class="fw-bold text-on-surface small">{{ getOrganisationName(breach) }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-outline-variant border-opacity-10">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 9px;">Org complexity</span>
                  <span class="fw-bold text-on-surface small">{{ getOrganisationSize(breach) }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-outline-variant border-opacity-10">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 9px;">Attack vector</span>
                  <span class="fw-bold text-on-surface small">{{ getAttackVectorLabel(breach) }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-outline-variant border-opacity-10" *ngIf="breach.source_url">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 9px;">Source link</span>
                  <a [href]="breach.source_url" target="_blank" class="text-primary text-decoration-none fw-bold small">External intel ↗</a>
                </div>
                <div class="mt-2">
                  <span class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 9px;">Exposed data types</span>
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
                <span class="text-xs-caps text-on-surface">Monitoring alerts</span>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2" style="font-size: 8px;" (click)="showAddAlert = !showAddAlert">
                    {{ showAddAlert ? 'Cancel' : '+ Add alert' }}
                  </button>
                }
              </div>

              @if (showAddAlert) {
                <div class="card-body border-bottom border-outline-variant border-opacity-10 bg-surface-container-high">
                  <div class="row g-3">
                    <div class="col-12">
                      <input [(ngModel)]="newAlert.message" class="form-control bg-surface-container-low border-0 text-xs-caps" placeholder="Alert message..." style="font-size: 10px;" />
                    </div>
                    <div class="col-md-6">
                      <select [(ngModel)]="newAlert.alert_type" class="form-select bg-surface-container-low border-0 text-xs-caps" style="font-size: 10px;">
                        <option value="new_exposure">New exposure</option>
                        <option value="credential_stuffing">Credential stuffing</option>
                        <option value="dark_web_mention">Dark web mention</option>
                        <option value="domain_squatting">Domain squatting</option>
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
                      <button class="btn btn-primary text-xs-caps py-1 px-3" (click)="addAlert()" [disabled]="!newAlert.message" style="font-size: 9px;">Save alert</button>
                    </div>
                  </div>
                </div>
              }

              <div class="p-0 overflow-auto" style="max-height: 400px;">
                <ul class="list-group list-group-flush">
                  @if (alerts.length === 0) {
                    <li class="list-group-item bg-transparent text-on-surface-variant small text-center py-4 opacity-50">No active alerts</li>
                  }
                  @for (alert of alerts; track alert._id) {
                    <li class="list-group-item bg-transparent border-outline-variant border-opacity-10 p-3">
                      <div class="d-flex justify-content-between mb-2">
                        <span class="text-on-surface small fw-bold">{{ getAlertMessage(alert) }}</span>
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
                        @if (getAlertTimestamp(alert)) {
                          <span class="text-xs-caps font-mono" style="font-size: 8px;">{{ getAlertTimestamp(alert) | date:'short' }}</span>
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
                <span class="text-xs-caps text-on-surface">Incident timeline</span>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2" style="font-size: 8px;" (click)="showAddTimeline = !showAddTimeline">
                    {{ showAddTimeline ? 'Cancel' : '+ Add event' }}
                  </button>
                }
              </div>

              @if (showAddTimeline) {
                <div class="card-body border-bottom border-outline-variant border-opacity-10 bg-surface-container-high">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <input [(ngModel)]="newEvent.event_type" class="form-control bg-surface-container-low border-0 text-xs-caps" placeholder="Event type..." style="font-size: 10px;" />
                    </div>
                    <div class="col-md-6">
                      <input type="datetime-local" [(ngModel)]="newEvent.occurred_at" class="form-control bg-surface-container-low border-0 text-xs-caps text-on-surface" style="font-size: 10px;" />
                    </div>
                    <div class="col-12">
                      <textarea [(ngModel)]="newEvent.description" class="form-control bg-surface-container-low border-0 text-xs-caps" rows="2" placeholder="Event description..." style="font-size: 10px;"></textarea>
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-primary text-xs-caps py-1 px-3" (click)="addTimeline()" [disabled]="!newEvent.event_type || !newEvent.description" style="font-size: 9px;">Save event</button>
                    </div>
                  </div>
                </div>
              }

              <div class="card-body p-4">
                @if (timeline.length === 0) {
                  <p class="text-on-surface-variant small text-center py-4 opacity-50 text-xs-caps">No timeline data</p>
                }
                <div class="position-relative ps-4 ms-2 border-start border-outline-variant border-opacity-25 py-2">
                  @for (event of timeline; track event._id) {
                    <div class="mb-5 position-relative ps-3">
                      <div class="timeline-node"></div>
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
                          <div class="mt-2 text-xs-caps opacity-50" style="font-size: 7px;">Operator: {{ event.actor | uppercase }}</div>
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
                <span class="text-xs-caps text-on-surface">Mitigation protocols</span>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2" style="font-size: 8px;" (click)="showAddRemediation = !showAddRemediation">
                    {{ showAddRemediation ? 'Cancel' : '+ Add protocol' }}
                  </button>
                }
              </div>

              @if (showAddRemediation) {
                <div class="card-body border-bottom border-outline-variant border-opacity-10 bg-surface-container-high">
                  <div class="row g-3">
                    <div class="col-12">
                      <input [(ngModel)]="newAction.action" class="form-control bg-surface-container-low border-0 text-xs-caps" placeholder="Mitigation action..." style="font-size: 10px;" />
                    </div>
                    <div class="col-md-6">
                      <select [(ngModel)]="newAction.status" class="form-select bg-surface-container-low border-0 text-xs-caps" style="font-size: 10px;">
                        <option value="pending">PENDING</option>
                        <option value="in_progress">IN PROGRESS</option>
                        <option value="completed">COMPLETED</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <input [(ngModel)]="newAction.assigned_to" class="form-control bg-surface-container-low border-0 text-xs-caps" placeholder="Assigned operator..." style="font-size: 10px;" />
                    </div>
                    <div class="col-12 text-end">
                      <button class="btn btn-primary text-xs-caps py-1 px-3" (click)="addRemediation()" [disabled]="!newAction.action" style="font-size: 9px;">Save protocol</button>
                    </div>
                  </div>
                </div>
              }

              <div class="p-0">
                <ul class="list-group list-group-flush">
                  @if (remediation.length === 0) {
                    <li class="list-group-item bg-transparent text-on-surface-variant small text-center py-4 opacity-50 text-xs-caps">No active protocols</li>
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
                                  <option value="in_progress">IN PROGRESS</option>
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
                            <div class="text-xs-caps text-on-surface-variant opacity-50" style="font-size: 8px;">Assigned to: {{ action.assigned_to | uppercase }}</div>
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
                <h4 class="text-xs-caps text-on-surface">Secure access required</h4>
                <p class="text-on-surface-variant small mb-0">Full intelligence timeline and mitigation protocols require authorization.</p>
              </div>
              <a routerLink="/auth/login" class="btn btn-primary text-xs-caps py-2 w-100 mt-2">Authorize session</a>
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
    .timeline-node {
      position: absolute;
      left: -22px;
      top: 8px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary);
      border: 3px solid var(--surface-container-low);
      box-shadow: 0 0 0 1px rgba(123, 208, 255, 0.35);
    }
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
  private notifications = inject(NotificationService);
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
  newAlert: Partial<MonitoringAlert> = { message: '', alert_type: 'new_exposure', severity: 'medium', acknowledged: false };

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
        this.timeline = this.normalizeTimeline(this.breach?.timeline);
        this.remediation = Array.isArray(this.breach?.remediation) ? this.breach!.remediation! : [];
        this.alerts = this.normalizeAlerts((this.breach as any)?.monitoring_alerts);
        this.loading = false;
        if (this.auth.isAuthenticated()) {
          this.loadSubDocuments();
        }
        setTimeout(() => this.initMap(), 100);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Breach not found.';
        this.loading = false;
        this.notifications.show(this.error, 'error', 5000);
      },
    });
  }

  loadSubDocuments(): void {
    this.breachService.getTimeline(this.id).subscribe({
      next: (res: any) => {
        const normalized = this.normalizeTimeline(res.data);
        this.timeline = normalized.length ? normalized : this.timeline;
      },
    });
    this.breachService.getRemediation(this.id).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res.data) ? res.data : [];
        this.remediation = data.length ? data : this.remediation;
      },
    });
    this.breachService.getAlerts(this.id).subscribe({
      next: (res: any) => {
        const normalized = this.normalizeAlerts(res.data);
        this.alerts = normalized.length ? normalized : this.alerts;
      },
    });
    if (this.auth.isAnalyst()) {
      this.breachService.getAffectedAccounts(this.id).subscribe({
        next: (res: any) => (this.accounts = res.data ?? []),
      });
    }
  }

  // Management Actions
  addTimeline(): void {
    const eventDate = this.newEvent.occurred_at || new Date().toISOString();
    const payload: any = {
      event_date: eventDate,
      event_type: this.normalizeEventType(this.newEvent.event_type),
      description: this.newEvent.description,
      actor: this.newEvent.actor,
    };

    this.breachService.addTimelineEvent(this.id, payload).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddTimeline = false;
        this.newEvent = { event_type: '', description: '', occurred_at: new Date().toISOString().slice(0, 16) };
        this.notifications.show('Timeline event added.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to add timeline event.'),
    });
  }

  deleteTimeline(eventId: string): void {
    if (!confirm('Delete this timeline event?')) return;
    this.breachService.deleteTimelineEvent(this.id, eventId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Timeline event deleted.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Failed to delete timeline event.'),
    });
  }

  addRemediation(): void {
    const payload: any = {
      action: this.newAction.action,
      status: this.newAction.status,
      assigned_to: this.newAction.assigned_to,
      due_date: (this.newAction as any).due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.breachService.addRemediation(this.id, payload).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddRemediation = false;
        this.newAction = { action: '', status: 'pending', assigned_to: '' };
        this.notifications.show('Remediation protocol added.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to add remediation protocol.'),
    });
  }

  updateRemediationStatus(action: RemediationAction, event: any): void {
    const newStatus = event.target.value;
    this.breachService.updateRemediation(this.id, action._id!, { status: newStatus }).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Remediation status updated.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Failed to update remediation status.'),
    });
  }

  deleteRemediation(actionId: string): void {
    if (!confirm('Delete this remediation action?')) return;
    this.breachService.deleteRemediation(this.id, actionId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Remediation protocol deleted.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Failed to delete remediation protocol.'),
    });
  }

  addAlert(): void {
    const payload: any = {
      alert_type: this.normalizeAlertType(this.newAlert.alert_type),
      severity: this.newAlert.severity,
      details: this.newAlert.message,
      acknowledged: Boolean(this.newAlert.acknowledged),
    };

    this.breachService.addAlert(this.id, payload).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddAlert = false;
        this.newAlert = { message: '', alert_type: 'new_exposure', severity: 'medium', acknowledged: false };
        this.notifications.show('Monitoring alert added.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to add monitoring alert.'),
    });
  }

  toggleAlertAck(alert: MonitoringAlert): void {
    this.breachService.updateAlert(this.id, alert._id!, { acknowledged: !alert.acknowledged }).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Alert acknowledgement updated.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Failed to update alert acknowledgement.'),
    });
  }

  deleteAlert(alertId: string): void {
    if (!confirm('Delete this monitoring alert?')) return;
    this.breachService.deleteAlert(this.id, alertId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Monitoring alert deleted.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Failed to delete monitoring alert.'),
    });
  }

  addAccount(): void {
    this.breachService.addAffectedAccount(this.id, this.newAccount).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddAccount = false;
        this.newAccount = { email: '', username: '', notified: false };
        this.notifications.show('Affected account added.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to add affected account.'),
    });
  }

  toggleAccountNotified(acc: AffectedAccount): void {
    this.breachService.updateAffectedAccount(this.id, acc._id!, { notified: !acc.notified }).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Account notification status updated.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Failed to update account status.'),
    });
  }

  deleteAccount(accId: string): void {
    if (!confirm('Remove this account record?')) return;
    this.breachService.deleteAffectedAccount(this.id, accId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Affected account removed.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Failed to remove affected account.'),
    });
  }

  private notifyApiError(err: any, fallback: string): void {
    const message = err?.error?.message ?? fallback;
    this.notifications.show(message, 'error', 5000);
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
          <div class="text-xs-caps text-on-surface-variant mb-0" style="font-size: 8px;">${this.getOrganisationName(this.breach)}</div>
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

  getAttackVectorLabel(breach: Breach | null): string {
    const vector = (breach as any)?.attack_vector;
    if (typeof vector === 'string' && vector.trim()) return vector.toUpperCase();

    const description = typeof breach?.description === 'string' ? breach.description.toLowerCase() : '';
    const patterns: Array<{ regex: RegExp; label: string }> = [
      { regex: /(phish|spear\s*phish|smish|vish|social engineering)/i, label: 'PHISHING' },
      { regex: /(ransomware|encrypt(ed|ion)? files|double extortion)/i, label: 'RANSOMWARE' },
      { regex: /(credential stuffing|password spray|brute force|stolen credentials)/i, label: 'Credential stuffing' },
      { regex: /(sql injection|sqli|injection flaw)/i, label: 'SQL_INJECTION' },
      { regex: /(api (key )?leak|exposed api|token leak|hardcoded secret)/i, label: 'API_EXPOSURE' },
      { regex: /(misconfig|misconfiguration|open bucket|public s3|exposed database|unsecured database)/i, label: 'MISCONFIGURATION' },
      { regex: /(third[- ]party|vendor|supply chain|dependency compromise)/i, label: 'SUPPLY_CHAIN' },
      { regex: /(malware|infostealer|trojan|keylogger)/i, label: 'MALWARE' },
      { regex: /(insider|privilege abuse|internal actor)/i, label: 'INSIDER_THREAT' },
    ];

    if (description) {
      const match = patterns.find((p) => p.regex.test(description));
      if (match) return match.label;
    }

    const source = (breach as any)?.source;
    if (typeof source === 'string' && source.trim()) return `${source}_INTEL`.toUpperCase();
    if (typeof breach?.source_url === 'string' && breach.source_url.trim()) return 'OPEN_SOURCE_INTEL';
    return 'UNSPECIFIED';
  }

  normalizeTimeline(data: any): TimelineEvent[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      ...item,
      occurred_at: item?.occurred_at ?? item?.event_date ?? item?.created_at,
    }));
  }

  normalizeAlerts(data: any): MonitoringAlert[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      ...item,
      message: item?.message ?? item?.details ?? item?.alert_type ?? 'Alert',
      created_at: item?.created_at ?? item?.triggered_at,
      acknowledged: Boolean(item?.acknowledged),
    }));
  }

  getAlertMessage(alert: MonitoringAlert): string {
    const msg = (alert as any)?.message ?? (alert as any)?.details;
    return typeof msg === 'string' && msg.trim() ? msg : 'NO_ALERT_MESSAGE';
  }

  getAlertTimestamp(alert: MonitoringAlert): string | undefined {
    const ts = (alert as any)?.created_at ?? (alert as any)?.triggered_at;
    return typeof ts === 'string' && ts.trim() ? ts : undefined;
  }

  normalizeEventType(eventType?: string): string {
    const value = (eventType || '').toLowerCase().trim();
    const allowed = new Set(['breach_occurred', 'discovered', 'disclosed', 'contained', 'resolved']);
    if (allowed.has(value)) return value;
    return 'discovered';
  }

  normalizeAlertType(alertType?: string): string {
    const value = (alertType || '').toLowerCase().trim();
    const allowed = new Set(['new_exposure', 'credential_stuffing', 'dark_web_mention', 'domain_squatting']);
    if (allowed.has(value)) return value;
    return 'new_exposure';
  }

  getOrganisationName(breach: Breach | null): string {
    const org: any = breach?.organisation;
    if (typeof org === 'string' && org.trim()) return org;
    if (org && typeof org.name === 'string' && org.name.trim()) return org.name;
    return 'UNSPECIFIED';
  }

  getOrganisationSize(breach: Breach | null): string {
    const direct = (breach as any)?.organisation_size;
    if (typeof direct === 'string' && direct.trim()) return direct;
    const nested = (breach?.organisation as any)?.size;
    if (typeof nested === 'string' && nested.trim()) return nested;

    const affected = Number((breach as any)?.affected_records_count ?? 0);
    if (Number.isFinite(affected) && affected > 0) {
      if (affected >= 1_000_000) return 'ENTERPRISE';
      if (affected >= 100_000) return 'LARGE';
      if (affected >= 10_000) return 'MID';
      return 'SMALL';
    }

    return 'UNSPECIFIED';
  }
}
