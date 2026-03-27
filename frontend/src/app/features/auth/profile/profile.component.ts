import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, UpperCasePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, UpperCasePipe],
  template: `
    <div class="row justify-content-center mt-4">
      <div class="col-md-7 col-lg-5">
        <div class="card bg-dark border-secondary">
          <div class="card-body p-4">
            <div class="d-flex align-items-center gap-3 mb-4">
              <!-- Avatar -->
              <div
                class="rounded-circle bg-danger d-flex align-items-center justify-content-center text-white fw-bold"
                style="width:56px;height:56px;font-size:1.4rem"
              >
                {{ initials }}
              </div>
              <div>
                <h5 class="fw-bold text-light mb-0">{{ user?.username }}</h5>
                <small class="text-muted">{{ user?.email }}</small>
              </div>
            </div>

            <dl class="row small mb-0">
              <dt class="col-sm-4 text-muted">Role</dt>
              <dd class="col-sm-8">
                <span
                  class="badge"
                  [ngClass]="{
                    'bg-danger': user?.role === 'admin',
                    'bg-primary': user?.role === 'analyst',
                    'bg-secondary': user?.role === 'guest'
                  }"
                >{{ user?.role | uppercase }}</span>
              </dd>

              <dt class="col-sm-4 text-muted">Status</dt>
              <dd class="col-sm-8">
                <span class="badge" [ngClass]="user?.is_active ? 'bg-success' : 'bg-secondary'">
                  {{ user?.is_active ? 'Active' : 'Inactive' }}
                </span>
              </dd>

              @if (user?.created_at) {
                <dt class="col-sm-4 text-muted">Joined</dt>
                <dd class="col-sm-8 text-light">{{ user?.created_at | date:'mediumDate' }}</dd>
              }

              @if (user?.last_login) {
                <dt class="col-sm-4 text-muted">Last login</dt>
                <dd class="col-sm-8 text-light">{{ user?.last_login | date:'medium' }}</dd>
              }
            </dl>

            <hr class="border-secondary my-3" />

            <div class="d-flex gap-2">
              <a routerLink="/breaches" class="btn btn-sm btn-outline-secondary">
                View breaches
              </a>
              @if (auth.isAnalyst()) {
                <a routerLink="/admin" class="btn btn-sm btn-outline-warning">
                  Admin panel
                </a>
              }
              <button class="btn btn-sm btn-outline-danger ms-auto" (click)="auth.logout()">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);

  get user() {
    return this.auth.currentUser();
  }

  get initials(): string {
    return (this.user?.username ?? '?').charAt(0).toUpperCase();
  }

  ngOnInit(): void {
    // Re-fetch profile to get fresh data including last_login
    this.auth.fetchProfile().subscribe();
  }
}
