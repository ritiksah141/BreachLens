import {
  Component, OnInit, OnDestroy, inject, Input, ElementRef, ViewChild, effect
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { NgClass, DatePipe, DecimalPipe, TitleCasePipe, CommonModule, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreachService } from '../../../core/services/breach.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Breach, TimelineEvent, RemediationAction, MonitoringAlert, AffectedAccount } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { RiskLevelPipe } from '../../../shared/pipes/risk-level.pipe';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { CopyClipboardDirective } from '../../../shared/directives/copy-clipboard.directive';
import { RequireRoleDirective } from '../../../shared/directives/require-role.directive';

@Component({
  selector: 'app-breach-detail',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent, CommonModule, FormsModule, PercentPipe, TimeAgoPipe, RiskLevelPipe, CompactNumberPipe, CopyClipboardDirective, RequireRoleDirective],
  template: `
    <!-- Header glass bar -->
    <div class="glass-panel p-3 mb-4 shadow-lg d-flex justify-content-between align-items-center border-0">
      <a routerLink="/breaches" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 shadow-sm d-flex align-items-center gap-2 text-on-surface">
        <span class="material-symbols-outlined fs-6">arrow_back</span> BACK TO LOGS
      </a>
      <div class="d-flex align-items-center gap-3">
        @if (auth.isAnalyst()) {
          <div class="badge py-2 px-3 glass-panel border border-primary border-opacity-25 text-on-surface text-xs-caps shadow-sm">
            <span class="p-1 bg-success rounded-circle animate-pulse me-2" style="width: 8px; height: 8px; display: inline-block;"></span> ANALYST ACCESS
          </div>
        }
        <span class="badge py-2 px-3 glass-panel border border-primary border-opacity-25 text-primary text-xs-caps shadow-sm">ID: {{ (id).slice(-8) | uppercase }}</span>
      </div>
    </div>

    @if (loading) {
      <div class="text-center py-5 glass-panel border-0 shadow-lg">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-on-surface-variant text-xs-caps mt-3">Fetching intelligence packet...</p>
      </div>
    }

    @if (error) {
      <div class="glass-panel p-4 border-error border-start border-4 text-error shadow-lg animate__animated animate__shakeX">
        <span class="material-symbols-outlined fs-4 me-2">warning</span> {{ error }}
      </div>
    }

    @if (breach && !loading) {
      <!-- System Parameters Row -->
      <div class="glass-panel p-3 mb-4 shadow-lg border-0 d-flex justify-content-around align-items-center flex-wrap gap-4">
        <div class="d-flex align-items-center gap-2">
           <span class="p-1 bg-primary rounded-circle shadow-sm"></span>
           <span class="text-xs-caps fw-bold text-on-surface" style="font-size: 8px; letter-spacing: 0.15em;">ENCRYPTION PROTOCOLS: AES-GCM</span>
        </div>
        <div class="d-flex align-items-center gap-2">
           <span class="p-1 bg-secondary rounded-circle shadow-sm"></span>
           <span class="text-xs-caps fw-bold text-on-surface" style="font-size: 8px; letter-spacing: 0.15em;">ORBITAL DATA: SYNCED</span>
        </div>
        <div class="d-flex align-items-center gap-2">
           <span class="p-1 bg-success rounded-circle shadow-sm"></span>
           <span class="text-xs-caps fw-bold text-on-surface" style="font-size: 8px; letter-spacing: 0.15em;">TECHNICAL SPECIFICATIONS: NOMINAL</span>
        </div>
      </div>

      <!-- Bento Layout Top -->
      <div class="row g-4 mb-4">
        <div class="col-lg-8">
          <div class="glass-panel shadow-lg h-100 position-relative overflow-hidden border-0">
            <div class="card-body p-4 p-md-5 d-flex flex-column h-100">
              <div class="d-flex justify-content-between flex-wrap gap-3 mb-4">
                <div class="d-flex gap-2 align-items-center">
                  <app-severity-badge [severity]="breach.severity" />
                  <span class="badge py-2 px-3 glass-panel border border-outline-variant border-opacity-25 text-on-surface-variant text-xs-caps">{{ (breach.status || 'LOGGED') | uppercase }}</span>
                  <span class="badge py-2 px-3 glass-panel border border-outline-variant border-opacity-25 text-on-surface-variant text-xs-caps">{{ (breach.industry || 'OTHER') | uppercase }}</span>
                </div>
                <ng-container *appRequireRole="['analyst', 'admin']">
                  <a [routerLink]="['/admin']" [queryParams]="{edit: breach._id}" class="btn btn-warning text-on-warning text-xs-caps py-1 px-3 shadow-lg fw-extrabold" style="font-size: 9px; box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);">
                    EDIT RECORD
                  </a>
                </ng-container>
              </div>
              <h2 class="font-headline fw-extrabold text-on-surface tracking-tight mb-2 fs-1">{{ breach.title }}</h2>
              <p class="text-on-surface-variant lead mb-5" style="max-width: 800px;">{{ breach.description }}</p>

              <div class="row g-3 mt-auto">
                <div class="col-6 col-md-3">
                  <div class="p-3 bg-surface-container-low rounded-3 border border-outline-variant border-opacity-10 text-center h-100 shadow-sm">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">RECORDS IMPACTED</div>
                    <div class="fs-4 fw-bold text-on-surface font-headline">{{ breach.affected_records_count | compactNumber }}</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 bg-surface-container-low rounded-3 border border-outline-variant border-opacity-10 text-center h-100 shadow-sm">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">RISK SCORE</div>
                    <div class="fs-4 fw-bold font-headline" [ngClass]="breach.risk_score | riskLevel:'class'">
                      {{ (breach.risk_score ?? 0) | number:'1.1-1' }}
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 bg-surface-container-low rounded-3 border border-outline-variant border-opacity-10 text-center h-100 shadow-sm">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">EVENT DATE</div>
                    <div class="fs-6 fw-bold text-on-surface">{{ breach.breach_date | date:'MMM dd, yyyy' }}</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 bg-surface-container-low rounded-3 border border-outline-variant border-opacity-10 text-center h-100 shadow-sm">
                    <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">DETECTION LAG</div>
                    <div class="fs-6 fw-bold text-on-surface">{{ detectionLag }} DAYS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="glass-panel shadow-lg h-100 overflow-hidden border-0">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
              <span class="text-xs-caps text-on-surface fw-bold">GEOSPATIAL ORIGIN</span>
              <span class="material-symbols-outlined fs-6 text-primary">location_on</span>
            </div>
            <div class="card-body p-0 position-relative" style="height: calc(100% - 50px);">
              @if (breach.location?.coordinates) {
                <div #mapContainer id="breach-map" style="height: 100%; min-height: 350px;"></div>
              } @else {
                <div class="d-flex flex-column align-items-center justify-content-center h-100 p-5 text-center opacity-25">
                  <span class="material-symbols-outlined fs-1 mb-2 text-on-surface">map_off</span>
                  <div class="text-xs-caps text-on-surface">Coordinates unavailable</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Parameters & Monitoring Section -->
      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <div class="glass-panel shadow-lg h-100 border-0 overflow-hidden">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 bg-surface-container-low">
              <span class="text-xs-caps text-primary fw-bold">INTELLIGENCE PARAMETERS</span>
            </div>
            <div class="card-body p-4">
              <div class="d-flex flex-column gap-3">
                <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">ORGANIZATION</span>
                  <span class="fw-bold small text-on-surface">{{ getOrganisationName(breach) }}</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">COMPLEXITY</span>
                  <span class="fw-bold small text-on-surface">{{ getOrganisationSize(breach) }}</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">ATTACK VECTOR</span>
                  <span class="fw-bold small text-on-surface">{{ getAttackVectorLabel(breach) }}</span>
                </div>
                <div class="mt-2">
                  <span class="text-xs-caps text-on-surface-variant d-block mb-2" style="font-size: 8px;">EXPOSED DATA TYPES</span>
                  <div class="d-flex flex-nowrap gap-2 overflow-auto custom-scrollbar pb-2">
                    @for (dt of breach.data_types_exposed; track dt) {
                      <span class="badge py-2 px-3 glass-panel border border-outline-variant border-opacity-25 text-on-surface text-xs-caps shadow-sm flex-shrink-0" style="font-size: 7.5px;">{{ dt.split('_').join(' ') | uppercase }}</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="glass-panel shadow-lg h-100 border-0 overflow-hidden">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
              <span class="text-xs-caps text-primary fw-bold">MONITORING ALERTS</span>
              @if (auth.isAnalyst()) {
                <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2 text-on-surface fw-bold shadow-sm" style="font-size: 8px;" (click)="showAddAlert = !showAddAlert">
                  {{ showAddAlert ? 'CANCEL' : '+ ADD ALERT' }}
                </button>
              }
            </div>

            @if (showAddAlert) {
              <div class="p-4 border-bottom border-outline-variant border-opacity-10 bg-surface-container-high">
                <div class="row g-3">
                  <div class="col-12">
                    <input [(ngModel)]="newAlert.message" class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" placeholder="ALERT MESSAGE..." style="font-size: 10px;" />
                  </div>
                  <div class="col-md-6">
                    <select [(ngModel)]="newAlert.alert_type" class="form-select bg-surface-container-low border-0 text-on-surface text-xs-caps" style="font-size: 10px;">
                      <option value="new_exposure">NEW EXPOSURE</option>
                      <option value="credential_stuffing">CREDENTIAL STUFFING</option>
                      <option value="dark_web_mention">DARK WEB MENTION</option>
                      <option value="domain_squatting">DOMAIN SQUATTING</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <select [(ngModel)]="newAlert.severity" class="form-select bg-surface-container-low border-0 text-on-surface text-xs-caps" style="font-size: 10px;">
                      <option value="critical">CRITICAL</option>
                      <option value="high">HIGH</option>
                      <option value="medium">MEDIUM</option>
                      <option value="low">LOW</option>
                    </select>
                  </div>
                  <div class="col-12 text-end">
                    <button class="btn btn-primary text-on-primary text-xs-caps py-1 px-3 fw-bold" (click)="addAlert()" [disabled]="!newAlert.message" style="font-size: 9px;">SAVE ALERT</button>
                  </div>
                </div>
              </div>
            }

            <div class="p-0 overflow-auto custom-scrollbar" style="max-height: 250px;">
              <ul class="list-group list-group-flush">
                @for (alert of alerts; track alert._id) {
                  <li class="list-group-item bg-transparent border-outline-variant border-opacity-10 p-3 hover-bg-surface-container-high transition-all">
                    <div class="d-flex justify-content-between mb-2 gap-3">
                      <span class="text-on-surface small fw-bold">{{ getAlertMessage(alert) }}</span>
                      <div class="d-flex gap-2 align-items-center flex-shrink-0">
                        @if (auth.isAnalyst()) {
                          @if (!alert.acknowledged) {
                            <button class="btn btn-primary text-on-primary text-xs-caps py-1 px-2 fw-extrabold shadow-lg" style="font-size: 7px; box-shadow: 0 0 10px rgba(123, 208, 255, 0.4);" (click)="toggleAlertAck(alert)">ACKNOWLEDGE</button>
                          } @else {
                            <button class="btn btn-dark bg-surface-container-highest border-0 text-on-surface text-xs-caps py-1 px-2" style="font-size: 7px;" (click)="toggleAlertAck(alert)">UNDO</button>
                          }
                          <button class="btn-close-tactical" (click)="deleteAlert(alert._id!)"><span class="material-symbols-outlined">close</span></button>
                        }
                        <span class="badge text-xs-caps py-1 px-2 shadow-sm" [ngClass]="alert.acknowledged ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-20' : 'bg-severity-critical text-white shadow-sm'" style="font-size: 7px;">
                          {{ alert.acknowledged ? 'ACKNOWLEDGED' : 'OPEN' }}
                        </span>
                      </div>
                    </div>
                    <div class="text-xs-caps opacity-50 text-on-surface-variant" style="font-size: 7px;">{{ alert.alert_type.split('_').join(' ') | uppercase }} // {{ alert.severity | uppercase }}</div>
                  </li>
                }
                @if (alerts.length === 0) {
                  <li class="list-group-item bg-transparent text-center py-5 opacity-25 text-xs-caps text-on-surface">NO ACTIVE ALERTS</li>
                }
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- INCIDENT TIMELINE SECTION -->
      @if (auth.isAuthenticated()) {
        <div class="row g-4 mb-4">
          <div class="col-12">
            <div class="glass-panel shadow-lg border-0 p-4 p-md-5">
              <div class="d-flex justify-content-between align-items-center mb-5">
                <h5 class="text-xs-caps text-primary fw-bold m-0 fs-5">INCIDENT TIMELINE</h5>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 text-on-surface fw-bold shadow-sm" style="font-size: 9px;" (click)="showAddTimeline = !showAddTimeline">
                    {{ showAddTimeline ? 'CANCEL' : '+ ADD EVENT' }}
                  </button>
                }
              </div>

              @if (showAddTimeline) {
                <div class="glass-panel p-4 mb-5 border-primary border-opacity-20 bg-surface-container-high">
                  <div class="row g-3">
                    <div class="col-md-6"><input [(ngModel)]="newEvent.event_type" class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" placeholder="EVENT TYPE..." style="font-size: 10px;" /></div>
                    <div class="col-md-6"><input type="datetime-local" [(ngModel)]="newEvent.occurred_at" class="form-control bg-surface-container-low border-0 text-xs-caps text-on-surface shadow-inner" style="font-size: 10px;" /></div>
                    <div class="col-12"><textarea [(ngModel)]="newEvent.description" class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" rows="2" placeholder="EVENT DESCRIPTION..." style="font-size: 10px;"></textarea></div>
                    <div class="col-12 text-end"><button class="btn btn-primary text-on-primary text-xs-caps py-1 px-3 fw-bold" (click)="addTimeline()" style="font-size: 9px;">SAVE EVENT</button></div>
                  </div>
                </div>
              }

              <div class="d-flex flex-column gap-5">
                @for (event of timeline; track event._id) {
                  <div class="animate__animated animate__fadeInUp">
                    <div class="text-xs-caps text-primary fw-extrabold mb-2 ps-1" style="font-size: 9px; letter-spacing: 0.15em;">{{ event.event_type.split('_').join(' ') | uppercase }}</div>
                    <div class="glass-panel p-4 shadow-lg border-0 bg-surface-container-low">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                         <span class="text-xs-caps font-mono opacity-50 text-on-surface-variant" style="font-size: 8px;">{{ event.occurred_at | date:'yyyy.MM.dd || HH:mm' }}</span>
                         @if (auth.isAnalyst()) {
                           <button class="btn-close-tactical" (click)="deleteTimeline(event._id!)"><span class="material-symbols-outlined">close</span></button>
                         }
                      </div>
                      <p class="text-on-surface small mb-4 lead" style="font-size: 0.85rem; line-height: 1.6;">{{ event.description }}</p>
                      @if (event.actor) {
                         <div class="mt-3 pt-3 border-top border-outline-variant border-opacity-10 d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined fs-6 text-primary opacity-75">person_outline</span>
                            <span class="text-xs-caps opacity-50 text-on-surface-variant" style="font-size: 7px;">OPERATOR: {{ event.actor | uppercase }}</span>
                         </div>
                      }
                    </div>
                  </div>
                }
                @if (timeline.length === 0) {
                  <div class="p-5 text-center opacity-25 text-xs-caps text-on-surface">NO TIMELINE RECORDS CAPTURED</div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- MITIGATION PROTOCOLS SECTION -->
      @if (auth.isAuthenticated()) {
        <div class="row g-4 mb-5">
          <div class="col-12">
            <div class="glass-panel shadow-lg border-0 p-4 p-md-5">
              <div class="d-flex justify-content-between align-items-center mb-5">
                <h5 class="text-xs-caps text-primary fw-bold m-0 fs-5">MITIGATION PROTOCOLS</h5>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 text-on-surface fw-bold shadow-sm" style="font-size: 8px;" (click)="showAddRemediation = !showAddRemediation">
                    {{ showAddRemediation ? 'CANCEL' : '+ ADD PROTOCOL' }}
                  </button>
                }
              </div>

              @if (showAddRemediation) {
                <div class="glass-panel p-4 mb-5 border-primary border-opacity-20 bg-surface-container-high">
                  <div class="row g-3">
                    <div class="col-12"><input [(ngModel)]="newAction.action" class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" placeholder="MITIGATION ACTION..." style="font-size: 10px;" /></div>
                    <div class="col-md-6"><select [(ngModel)]="newAction.status" class="form-select bg-surface-container-low border-0 text-on-surface text-xs-caps" style="font-size: 10px;"><option value="pending">PENDING</option><option value="in_progress">IN PROGRESS</option><option value="completed">COMPLETED</option></select></div>
                    <div class="col-md-6"><input [(ngModel)]="newAction.assigned_to" class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" placeholder="ASSIGNED OPERATOR..." style="font-size: 10px;" /></div>
                    <div class="col-12 text-end"><button class="btn btn-primary text-on-primary text-xs-caps py-1 px-3 fw-bold" (click)="addRemediation()" style="font-size: 9px;">SAVE PROTOCOL</button></div>
                  </div>
                </div>
              }

              <div class="d-flex flex-column gap-3">
                @for (action of remediation; track action._id) {
                  <div class="animate__animated animate__fadeInUp">
                    <div class="text-xs-caps text-primary fw-extrabold mb-2 ps-1" style="font-size: 9px; letter-spacing: 0.15em;">PROTOCOL ENTRY</div>
                    <div class="glass-panel p-4 shadow-lg border-0 d-flex justify-content-between align-items-center bg-surface-container-low">
                      <div class="flex-grow-1 pe-4">
                        <div class="fw-bold text-on-surface small mb-1">{{ action.action }}</div>
                        <div class="text-xs-caps opacity-50 text-on-surface-variant d-flex align-items-center gap-2" style="font-size: 8px;">
                           <span class="material-symbols-outlined fs-6" style="font-size: 12px;">account_circle</span>
                           {{ action.assigned_to ? (action.assigned_to | uppercase) : 'UNASSIGNED' }}
                        </div>
                      </div>
                      <div class="d-flex gap-3 align-items-center">
                        @if (auth.isAnalyst()) {
                          <select [ngModel]="action.status" (change)="updateRemediationStatus(action, $event)" class="form-select bg-surface-container-low border-0 text-on-surface text-xs-caps py-0 px-2 shadow-sm" style="font-size: 8px; height: 26px; width: auto; min-width: 100px;">
                            <option value="pending">PENDING</option><option value="in_progress">IN PROGRESS</option><option value="completed">COMPLETED</option>
                          </select>
                          <button class="btn-close-tactical" (click)="deleteRemediation(action._id!)"><span class="material-symbols-outlined">close</span></button>
                        }
                        <span class="badge text-xs-caps py-2 px-3 border shadow-sm" [ngClass]="{
                          'bg-success bg-opacity-10 text-success border-success border-opacity-25': action.status === 'completed',
                          'bg-warning bg-opacity-10 text-warning border-warning border-opacity-25': action.status === 'in_progress',
                          'bg-surface-container-highest text-on-surface-variant border-outline-variant': action.status === 'pending'
                        }" style="font-size: 7px; min-width: 80px; text-align: center;">{{ action.status | uppercase }}</span>
                      </div>
                    </div>
                  </div>
                }
                @if (remediation.length === 0) {
                  <div class="p-5 text-center opacity-25 text-xs-caps text-on-surface">NO MITIGATION PROTOCOLS LOGGED</div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    }
    <div class="pb-5"></div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--outline-variant); border-radius: 10px; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
    .shadow-inner { box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
  `],
})
export class BreachDetailComponent implements OnInit, OnDestroy {
  @Input() id = '';
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private breachService = inject(BreachService);
  private themeService = inject(ThemeService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  private map: any;
  private tileLayer: any;

  private _themeWatcher = effect(() => {
    this.themeService.theme();
    if (this.map) this.updateTileLayer();
  });

  breach: Breach | null = null;
  timeline: TimelineEvent[] = [];
  remediation: RemediationAction[] = [];
  alerts: MonitoringAlert[] = [];
  accounts: AffectedAccount[] = [];
  loading = false;
  error = '';

  showAddTimeline = false;
  newEvent: Partial<TimelineEvent> = { event_type: '', description: '', occurred_at: new Date().toISOString().slice(0, 16) };
  showAddRemediation = false;
  newAction: Partial<RemediationAction> = { action: '', status: 'pending', assigned_to: '' };
  showAddAlert = false;
  newAlert: Partial<MonitoringAlert> = { message: '', alert_type: 'new_exposure', severity: 'medium', acknowledged: false };

  get detectionLag(): number {
    if (!this.breach?.breach_date || !this.breach?.discovered_date) return 0;
    const start = new Date(this.breach.breach_date);
    const end = new Date(this.breach.discovered_date);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['breach'];
    if (resolved) {
      this.applyBreach(resolved);
    } else {
      this.loadBreach();
    }
  }

  private applyBreach(data: any): void {
    this.breach = data;
    this.timeline = this.normalizeTimeline(this.breach?.timeline);
    this.remediation = Array.isArray(this.breach?.remediation) ? this.breach!.remediation! : [];
    this.alerts = this.normalizeAlerts((this.breach as any)?.monitoring_alerts);
    this.loading = false;
    if (this.auth.isAuthenticated()) {
      this.loadSubDocuments();
    }
    setTimeout(() => this.initMap(), 100);
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
        this.applyBreach(this.breach);
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

  addTimeline(): void {
    const eventDate = this.newEvent.occurred_at || new Date().toISOString();
    const payload: any = {
      event_date: eventDate,
      event_type: this.normalizeEventType(this.newEvent.event_type),
      description: this.newEvent.description,
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
    if (!confirm('Permanently remove this timeline event?')) return;
    this.breachService.deleteTimelineEvent(this.id, eventId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Timeline event removed.', 'info', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to remove event')
    });
  }

  addRemediation(): void {
    const payload: any = {
      action: this.newAction.action,
      status: this.newAction.status,
      assigned_to: this.newAction.assigned_to,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
    if (!confirm('Permanently remove this mitigation protocol?')) return;
    this.breachService.deleteRemediation(this.id, actionId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Mitigation protocol removed.', 'info', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to remove protocol')
    });
  }

  addAlert(): void {
    const payload: any = {
      alert_type: this.normalizeAlertType(this.newAlert.alert_type),
      severity: this.newAlert.severity,
      details: this.newAlert.message,
      acknowledged: false,
    };

    this.breachService.addAlert(this.id, payload).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddAlert = false;
        this.newAlert = { message: '', alert_type: 'new_exposure', severity: 'medium', acknowledged: false };
        this.notifications.show('Monitoring alert added.', 'success', 2500);
      },
      error: (err) => this.notifications.show('Alert addition failed', 'error'),
    });
  }

  toggleAlertAck(alert: MonitoringAlert): void {
    this.breachService.updateAlert(this.id, alert._id!, { acknowledged: !alert.acknowledged }).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Alert acknowledgement updated.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Update failed'),
    });
  }

  deleteAlert(alertId: string): void {
    if (!confirm('Permanently remove this monitoring alert?')) return;
    this.breachService.deleteAlert(this.id, alertId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Monitoring alert removed.', 'info', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to remove alert')
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

    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false }).setView([lat, lng], 10);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.updateTileLayer();

    const icon = L.divIcon({
      html: `<div style="background:var(--severity-critical); width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow: 0 0 10px rgba(248, 113, 113, 0.8);"></div>`,
      className: '', iconSize: [16, 16], iconAnchor: [8, 8],
    });

    L.marker([lat, lng], { icon }).addTo(this.map);
  }

  private async updateTileLayer() {
    const L = await import('leaflet' as any);
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    const isDark = this.themeService.theme() === 'dark';
    const url = isDark ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png' : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';
    this.tileLayer = L.tileLayer(url, { attribution: '&copy; Stadia Maps', maxZoom: 20 }).addTo(this.map);
  }

  getAttackVectorLabel(breach: Breach | null): string {
    const vector = (breach as any)?.attack_vector || 'UNSPECIFIED';
    return vector.replace(/_/g, ' ').toUpperCase();
  }

  normalizeTimeline(data: any): TimelineEvent[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({ ...item, occurred_at: item?.occurred_at ?? item?.event_date ?? item?.created_at }));
  }

  normalizeAlerts(data: any): MonitoringAlert[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({ ...item, message: item?.message ?? item?.details ?? item?.alert_type ?? 'Alert', created_at: item?.created_at ?? item?.triggered_at, acknowledged: Boolean(item?.acknowledged) }));
  }

  getAlertMessage(alert: MonitoringAlert): string {
    const msg = (alert as any)?.message ?? (alert as any)?.details;
    return typeof msg === 'string' && msg.trim() ? msg : 'NO ALERT MESSAGE';
  }

  getAlertTimestamp(alert: MonitoringAlert): string | undefined {
    const ts = (alert as any)?.created_at ?? (alert as any)?.triggered_at;
    return ts;
  }

  normalizeEventType(eventType?: string): string {
    const value = (eventType || '').toLowerCase().trim();
    const allowed = new Set(['breach_occurred', 'discovered', 'disclosed', 'contained', 'resolved']);
    return allowed.has(value) ? value : 'discovered';
  }

  normalizeAlertType(alertType?: string): string {
    const value = (alertType || '').toLowerCase().trim();
    const allowed = new Set(['new_exposure', 'credential_stuffing', 'dark_web_mention', 'domain_squatting']);
    return allowed.has(value) ? value : 'new_exposure';
  }

  getOrganisationName(breach: Breach | null): string {
    const org: any = breach?.organisation;
    if (typeof org === 'string' && org.trim()) return org;
    if (org && typeof org.name === 'string') return org.name;
    return org?.name || 'UNSPECIFIED';
  }

  getOrganisationSize(breach: Breach | null): string {
    const direct = (breach as any)?.organisation_size;
    if (typeof direct === 'string' && direct.trim()) return direct;

    const nested = (breach?.organisation as any)?.size;
    if (typeof nested === 'string' && nested.trim()) return nested.toUpperCase();

    const affected = Number((breach as any)?.affected_records_count ?? 0);
    if (Number.isFinite(affected) && affected > 0) {
      if (affected >= 1_000_000) return 'ENTERPRISE';
      if (affected >= 100_000) return 'LARGE';
      if (affected >= 10_000) return 'MID';
      return 'SMALL';
    }

    return 'UNSPECIFIED';
  }

  severityColor(s: string): string {
    const colors: any = { critical: 'error', high: 'high', medium: 'medium', low: 'primary', informational: 'on-surface-variant' };
    return colors[s?.toLowerCase()] || 'on-surface-variant';
  }
}
