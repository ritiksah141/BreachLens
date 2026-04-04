import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgClass, CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass, CommonModule],
  template: `
    <div class="row justify-content-center align-items-center min-vh-75 mt-5">
      <div class="col-md-5 col-lg-4">
        <!-- Brand Anchor -->
        <div class="text-center mb-5">
          <div class="d-inline-flex p-3 bg-surface-container rounded-3 mb-3 glow-primary">
            <span class="material-symbols-outlined text-primary fs-2" style="font-variation-settings: 'FILL' 1;">security</span>
          </div>
          <h1 class="font-headline fw-extrabold text-on-surface tracking-tighter mb-1">BreachLens</h1>
          <p class="text-xs-caps text-on-surface-variant">Intelligence Suite</p>
        </div>

        <!-- Glassmorphism Container -->
        <div class="glass-panel p-4 p-md-5 rounded-4 shadow-lg border border-outline-variant border-opacity-10 position-relative">
          <div class="position-absolute top-0 end-0 p-3 opacity-10">
            <span class="material-symbols-outlined fs-4 text-on-surface">lock</span>
          </div>

          <header class="mb-4">
            <h2 class="font-headline fs-4 fw-bold text-on-surface mb-2">Welcome Back</h2>
            <p class="text-on-surface-variant small mb-0">Secure authorization required for access.</p>
          </header>

          @if (serverError) {
            <div class="alert bg-error-container bg-opacity-10 border-error text-error py-2 small mb-4">
              <span class="material-symbols-outlined fs-6 me-2">error</span>
              {{ serverError }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="d-flex flex-column gap-4">
            <!-- Email Input -->
            <div>
              <label class="text-xs-caps text-on-surface-variant mb-2">Corporate Email</label>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">alternate_email</span>
                </span>
                <input
                  formControlName="email"
                  type="email"
                  class="form-control bg-surface-container-low border-0 ps-0 text-on-surface"
                  [ngClass]="{ 'is-invalid': f['email'].invalid && f['email'].touched }"
                  placeholder="name@organization.com"
                  style="font-size: 13px;"
                />
              </div>
              @if (f['email'].invalid && f['email'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">VALID_EMAIL_REQUIRED</div>
              }
            </div>

            <!-- Password Input -->
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="text-xs-caps text-on-surface-variant">Credential Key</label>
                <a href="#" class="text-decoration-none text-primary fw-bold" style="font-size: 10px;">FORGOT_KEY?</a>
              </div>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">lock</span>
                </span>
                <input
                  formControlName="password"
                  type="password"
                  class="form-control bg-surface-container-low border-0 ps-0 text-on-surface"
                  [ngClass]="{ 'is-invalid': f['password'].invalid && f['password'].touched }"
                  placeholder="••••••••••••"
                  style="font-size: 13px;"
                />
              </div>
              @if (f['password'].invalid && f['password'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">CREDENTIAL_REQUIRED</div>
              }
            </div>

            <!-- Action Button -->
            <button
              class="btn btn-primary w-100 py-3 mt-2 d-flex align-items-center justify-content-center gap-2"
              type="submit"
              [disabled]="loading"
            >
              @if (loading) {
                <span class="spinner-border spinner-border-sm"></span>
              } @else {
                <span>AUTHORIZE ACCESS</span>
                <span class="material-symbols-outlined fs-5">login</span>
              }
            </button>
          </form>

          <footer class="mt-5 pt-4 border-top border-outline-variant border-opacity-10 text-center">
            <p class="text-on-surface-variant small mb-0">
              New to the suite?
              <a routerLink="/auth/register" class="text-primary fw-bold text-decoration-none ms-1">REQUEST DEPLOYMENT</a>
            </p>
          </footer>
        </div>

        <!-- Security Badges -->
        <div class="mt-5 d-flex justify-content-center gap-4 opacity-25">
          <div class="d-flex align-items-center gap-2">
            <span class="material-symbols-outlined fs-6 text-on-surface">verified_user</span>
            <span class="text-xs-caps text-on-surface" style="font-size: 8px;">AES-256 ENCRYPTED</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="material-symbols-outlined fs-6 text-on-surface">security_update_good</span>
            <span class="text-xs-caps text-on-surface" style="font-size: 8px;">SOC2 COMPLIANT</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .min-vh-75 { min-height: 75vh; }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .text-error { color: var(--error) !important; }
    .border-error { border-color: var(--error) !important; }
    .glow-primary { box-shadow: 0 0 40px rgba(0, 167, 224, 0.15), 0 0 10px rgba(123, 208, 255, 0.05); }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notifications = inject(NotificationService);

  loading = false;
  serverError = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  get f() {
    return this.form.controls;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.serverError = '';

    this.auth.login(this.form.value as any).subscribe({
      next: () => {
        this.loading = false;
        this.notifications.show('Login successful. Welcome back.', 'success', 3000);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.serverError =
          err?.error?.message ?? 'Login failed. Check your credentials.';
        this.notifications.show(this.serverError, 'error', 5000);
      },
    });
  }
}
