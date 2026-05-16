import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
import { HealthService } from '../../core/services/health.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-defense-hub',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink],
  template: `
    <div class="defense-hub-container animate__animated animate__fadeIn">
      <!-- Page Header -->
      <div class="glass-panel p-4 mb-4 shadow-lg d-flex justify-content-between align-items-center border-0">
        <div class="title-wrapper">
          <h2 class="page-title mb-1">
            <span class="material-symbols-outlined text-primary opacity-50 me-2" style="font-size: 24px;">shield_person</span>
            Defense Hub
          </h2>
          <p class="text-xs-caps mb-0 text-on-surface-variant opacity-75" style="font-size: 7px; letter-spacing: 0.1em;">Personalized security posture and tactical remediation workspace.</p>
        </div>
        <div class="d-flex align-items-center gap-3">
           <span class="badge py-2 px-3 glass-panel border border-primary border-opacity-25 text-primary text-xs-caps shadow-sm d-flex align-items-center gap-2"
                 style="font-size: 8px;">
              <span class="status-dot-xs animate-pulse" [ngClass]="health.isBackendReady() ? 'bg-success' : 'bg-error'"></span>
              {{ health.isBackendReady() ? 'INTEL GATEWAY ACTIVE' : 'GATEWAY OFFLINE' }}
           </span>
        </div>
      </div>

      @if (loading) {
        <div class="text-center py-5 glass-panel border-0 shadow-lg">
          <div class="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
          <span class="text-on-surface-variant text-xs-caps" style="font-size: 7px;">DECONSTRUCTING RISK DNA...</span>
        </div>
      } @else if (exposureData) {
        <div class="row g-4">
          <!-- Top Row: Magnitude & Quick Stats -->
          <div class="col-lg-4">
            <div class="glass-panel p-4 shadow-lg h-100 border-0 border-start border-4" [ngClass]="exposureData.exposed ? 'border-error' : 'border-success'">
              <div class="text-xs-caps text-on-surface-variant mb-3" style="font-size: 8px;">Threat Magnitude</div>
              <div class="d-flex align-items-baseline gap-2 mb-1">
                <span class="fs-1 fw-extrabold font-headline" [ngClass]="exposureData.exposed ? 'text-error' : 'text-success'">
                  {{ exposureData.aggregated_risk_score | number:'1.1-1' }}
                </span>
                <span class="text-on-surface-variant opacity-50 text-xs-caps" style="font-size: 8px;">/ 10.0</span>
              </div>
              <div class="text-xs-caps fw-bold mb-4" [ngClass]="exposureData.exposed ? 'text-error' : 'text-success'" style="font-size: 7px;">
                {{ exposureData.exposed ? 'CRITICAL EXPOSURE DETECTED' : 'SYSTEMS NORMAL' }}
              </div>

              <div class="mt-auto pt-4 border-top border-outline-variant border-opacity-10">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="text-xs-caps opacity-75" style="font-size: 6px;">TOTAL INCURSIONS</span>
                  <span class="font-mono fw-bold" style="font-size: 10px;">{{ exposureData.breach_count }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-xs-caps opacity-75" style="font-size: 6px;">LAST VERIFIED</span>
                  <span class="font-mono opacity-50" style="font-size: 8px;">{{ today | date:'MMM dd, HH:mm' | uppercase }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Risk Genome Breakdown -->
          <div class="col-lg-8">
            <div class="glass-panel p-4 shadow-lg h-100">
              <h3 class="text-xs-caps text-on-surface border-bottom border-outline-variant border-opacity-10 pb-2 mb-4" style="font-size: 8px;">Risk Genome Breakdown</h3>
              <div class="row g-3">
                @for (cat of ['identity', 'credentials', 'financial', 'technical']; track cat) {
                  <div class="col-md-3">
                    <div class="p-3 rounded-3 h-100 transition-all border border-outline-variant border-opacity-10"
                         [ngClass]="exposureData.risk_genome[cat]?.length > 0 ? 'bg-surface-container-high' : 'bg-surface-container-low opacity-50'">
                      <div class="d-flex align-items-center gap-2 mb-3">
                        <span class="material-symbols-outlined fs-5"
                              [ngClass]="exposureData.risk_genome[cat]?.length > 0 ? getCategoryColor(cat) : 'text-on-surface-variant'">
                          {{ getCategoryIcon(cat) }}
                        </span>
                        <span class="text-xs-caps fw-bold" style="font-size: 7px;">{{ cat }}</span>
                      </div>
                      @if (exposureData.risk_genome[cat]?.length > 0) {
                        <div class="d-flex flex-column gap-1">
                          @for (field of exposureData.risk_genome[cat]; track field) {
                            <div class="d-flex align-items-center gap-2">
                               <span class="p-1 rounded-circle" [ngClass]="getCategoryBg(cat)" style="width: 4px; height: 4px;"></span>
                               <span class="text-xs-caps fw-bold opacity-75" style="font-size: 6px;">{{ field | uppercase }}</span>
                            </div>
                          }
                        </div>
                      } @else {
                        <div class="text-xs-caps opacity-50 fw-bold py-2" style="font-size: 6px;">NO EXPOSURE</div>
                      }
                    </div>
                  </div>
                }
              </div>
              <div class="mt-4 pt-3 border-top border-outline-variant border-opacity-10 text-xs-caps opacity-50 fw-bold" style="font-size: 6px;">
                 DNA DECONSTRUCTION: ANALYZING FOUR FUNCTIONAL RISK VECTORS
              </div>
            </div>
          </div>

          <!-- Tactical Defense Playbook -->
          <div class="col-lg-12">
            <div class="glass-panel p-4 shadow-lg">
              <h3 class="text-xs-caps text-on-surface border-bottom border-outline-variant border-opacity-10 pb-2 mb-4" style="font-size: 8px;">Tactical Defense Playbook</h3>
              @if (exposureData.defense_playbook?.length > 0) {
                <div class="row g-3">
                  @for (item of exposureData.defense_playbook; track item.action; let i = $index) {
                    <div class="col-md-6">
                      <div class="d-flex gap-4 p-3 rounded-3 bg-surface-container-low border-start border-4 shadow-sm h-100"
                           [ngClass]="item.priority === 'critical' ? 'border-error' : 'border-primary'">
                        <div class="playbook-step-number text-xs-caps fw-extrabold" [ngClass]="item.priority === 'critical' ? 'text-error' : 'text-primary'">
                           STEP {{ i + 1 }}
                        </div>
                        <div>
                          <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="text-xs-caps fw-extrabold text-on-surface" style="font-size: 8px;">{{ item.action }}</span>
                            <span class="badge rounded-pill bg-opacity-10 text-xs-caps px-2 py-0"
                                  [ngClass]="item.priority === 'critical' ? 'bg-error text-error border border-error border-opacity-25' : 'bg-primary text-primary border border-primary border-opacity-25'"
                                  style="font-size: 6px; transform: scale(0.9);">{{ item.priority | uppercase }}</span>
                          </div>
                          <p class="text-on-surface-variant opacity-75 fw-medium mb-0" style="font-size: 11px;">{{ item.details }}</p>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-4">
                  <span class="material-symbols-outlined text-success fs-1 mb-3">verified_user</span>
                  <p class="text-xs-caps text-on-surface opacity-75 mb-0">No tactical actions required. Identity status is clear.</p>
                </div>
              }
              <div class="mt-4 pt-3 border-top border-outline-variant border-opacity-10 text-xs-caps opacity-50 fw-bold d-flex justify-content-between align-items-center" style="font-size: 6px;">
                 <span>REAL-TIME ACTION PLAN GENERATED BASED ON RISK GENOME SEVERITY</span>
                 <a routerLink="/map" class="text-primary text-decoration-none hover-underline">INITIATE MANUAL RE-SCAN ></a>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="glass-panel p-5 text-center shadow-lg border-0 border-start border-error border-4">
          <span class="material-symbols-outlined text-error fs-1 mb-3">cloud_off</span>
          <h3 class="text-xs-caps text-error mb-2">Secure Intelligence Offline</h3>
          <p class="text-on-surface-variant mb-4 mx-auto" style="max-width: 400px; font-size: 0.8rem;">We could not retrieve your defense profile. Ensure the secure gateway is reachable and try again.</p>
          <button class="btn btn-primary rounded-pill px-4 text-xs-caps fw-bold" style="font-size: 8px;" (click)="loadExposure()">RETRY CONNECTION</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .defense-hub-container { padding: 1rem 0; }

    .playbook-step-number {
       width: 42px;
       flex-shrink: 0;
       font-size: 7px;
       letter-spacing: 0.1em;
       opacity: 0.7;
       padding-top: 4px;
    }

    .status-dot-xs {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      box-shadow: 0 0 8px currentColor;
    }
  `]
})
export class DefenseHubComponent implements OnInit {
  private breachService = inject(BreachService);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  public health = inject(HealthService);

  exposureData: any = null;
  loading = false;
  today = new Date();

  ngOnInit(): void {
    this.loadExposure();
  }

  loadExposure(): void {
    const user = this.auth.currentUser();
    if (!user?.email) return;

    this.loading = true;
    this.breachService.checkExposure(user.email).subscribe({
      next: (res) => {
        this.exposureData = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notifications.show('FAILED TO LOAD DEFENSE PROFILE', 'error');
      }
    });
  }

  getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'identity': return 'fingerprint';
      case 'credentials': return 'key';
      case 'financial': return 'payments';
      case 'technical': return 'lan';
      default: return 'data_object';
    }
  }

  getCategoryColor(cat: string): string {
    switch (cat) {
      case 'identity': return 'text-primary';
      case 'credentials': return 'text-warning';
      case 'financial': return 'text-error';
      case 'technical': return 'text-secondary';
      default: return 'text-on-surface-variant';
    }
  }

  getCategoryBg(cat: string): string {
    switch (cat) {
      case 'identity': return 'bg-primary';
      case 'credentials': return 'bg-warning';
      case 'financial': return 'bg-error';
      case 'technical': return 'bg-secondary';
      default: return 'bg-on-surface-variant';
    }
  }
}
