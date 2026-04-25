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
          <div class="login-brand-mark d-inline-flex mb-3" aria-hidden="true">
            <span class="login-brand-chip login-brand-chip-a">
              <span class="material-symbols-outlined login-brand-chip-icon">security</span>
            </span>
            <span class="login-brand-chip login-brand-chip-b">
              <span class="material-symbols-outlined login-brand-chip-icon">visibility</span>
            </span>
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
            <p class="text-on-surface-variant small mb-0">Please login to access your account.</p>
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
              <label class="text-xs-caps text-on-surface-variant mb-2">Email</label>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">alternate_email</span>
                </span>
                <input
                  formControlName="email"
                  type="email"
                  class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                  [ngClass]="{ 'is-invalid': f['email'].invalid && f['email'].touched }"
                  placeholder="Email Address"
                  style="font-size: 13px;"
                />
              </div>
              @if (f['email'].invalid && f['email'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">VALID EMAIL REQUIRED</div>
              }
            </div>

            <!-- Password Input -->
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="text-xs-caps text-on-surface-variant">Password</label>
                <button
                  type="button"
                  class="btn btn-outline-primary action-pill-btn action-pill-btn-sm"
                  (click)="onForgotPassword()"
                >
                  Forgot Password?
                </button>
              </div>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">lock</span>
                </span>
                <input
                  formControlName="password"
                  [type]="showPassword ? 'text' : 'password'"
                  class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                  [ngClass]="{ 'is-invalid': f['password'].invalid && f['password'].touched }"
                  placeholder="••••••••••••"
                  style="font-size: 13px;"
                />
                <button
                  type="button"
                  class="input-group-text bg-surface-container-low border-0 text-on-surface-variant pwd-toggle"
                  (click)="togglePasswordVisibility()"
                  [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
                >
                  <span class="material-symbols-outlined fs-6">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (f['password'].invalid && f['password'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">CREDENTIAL REQUIRED</div>
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
              New to BreachLens?
            </p>
            <button
              type="button"
              class="btn btn-outline-primary mt-3 px-4 py-2 action-pill-btn"
              (click)="goToRegister()"
            >
              Create account
            </button>
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
    .glow-primary { box-shadow: 0 0 40px color-mix(in srgb, var(--primary) 15%, transparent), 0 0 10px color-mix(in srgb, var(--primary) 5%, transparent); }
    .pwd-toggle { cursor: pointer; }
    .action-pill-btn {
      border-radius: 999px;
      letter-spacing: 0.08em;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      border-color: var(--outline-variant);
    }
    .action-pill-btn:hover {
      border-color: var(--primary);
      color: var(--on-surface);
      background: var(--surface-container-high);
    }
    .action-pill-btn-sm {
      padding: 0.22rem 0.6rem;
      font-size: 0.58rem;
      letter-spacing: 0.12em;
      line-height: 1.15;
    }
    .login-brand-mark {
      width: 62px;
      height: 62px;
      border-radius: 1rem;
      padding: 8px;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 1px solid var(--outline-variant);
      background: linear-gradient(145deg, var(--surface-container-high), var(--surface-container-low));
      box-shadow: 0 0 18px color-mix(in srgb, var(--primary) 12%, transparent);
      position: relative;
      overflow: hidden;
    }
    .login-brand-mark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        -35deg,
        transparent 0,
        transparent 6px,
        rgba(136, 146, 155, 0.16) 6px,
        rgba(136, 146, 155, 0.16) 7px
      );
      opacity: 0.5;
    }
    .login-brand-chip {
      position: relative;
      z-index: 1;
      width: 20px;
      height: 34px;
      border-radius: 0.55rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-headline);
      font-weight: 800;
      font-size: 0.9rem;
      letter-spacing: 0.05em;
      color: var(--primary);
      border: 1px solid var(--outline-variant);
      background: var(--surface-container-lowest);
      text-shadow: 0 0 8px color-mix(in srgb, var(--primary) 20%, transparent);
    }
    .login-brand-chip-icon {
      font-size: 13px;
      font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 20;
      line-height: 1;
    }
    .login-brand-chip-a { transform: rotate(-8deg) translateY(-1px); }
    .login-brand-chip-b { transform: rotate(8deg) translateY(1px); }
    :host-context([data-theme='light']) .login-brand-mark {
      box-shadow: 0 0 12px color-mix(in srgb, var(--primary) 10%, transparent);
    }
    :host-context([data-theme='light']) .login-brand-mark::before {
      opacity: 0.32;
    }
    :host-context([data-theme='light']) .login-brand-chip {
      text-shadow: none;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notifications = inject(NotificationService);

  loading = false;
  serverError = '';
  showPassword = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  get f() {
    return this.form.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register'], { queryParams: { role: 'analyst' } });
  }

  onForgotPassword(): void {
    this.router.navigate(['/auth/reset-password']);
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
