import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass, CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

function isStrongPassword(password: string): boolean {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass, CommonModule],
  template: `
    <div class="row justify-content-center align-items-center min-vh-75 mt-5">
      <div class="col-md-6 col-lg-5">
        <div class="glass-panel p-4 p-md-5 rounded-4 shadow-lg border border-outline-variant border-opacity-10">
          <header class="mb-4 text-center">
            <h2 class="font-headline fs-4 fw-bold text-on-surface mb-2">Reset Password</h2>
            <p class="text-on-surface-variant small mb-0">Request a reset token, then set your new password.</p>
          </header>

          <div class="d-flex gap-2 mb-4">
            <button type="button" class="btn w-100" [ngClass]="mode === 'request' ? 'btn-primary' : 'btn-outline-primary'" (click)="mode = 'request'">
              Request Token
            </button>
            <button type="button" class="btn w-100" [ngClass]="mode === 'reset' ? 'btn-primary' : 'btn-outline-primary'" (click)="mode = 'reset'">
              Set New Password
            </button>
          </div>

          @if (devToken) {
            <div class="alert bg-surface-container-high border border-outline-variant py-2 small mb-3">
              <div class="text-xs-caps mb-1">Development token</div>
              <code class="text-on-surface">{{ maskDevToken(devToken) }}</code>
            </div>
          }

          @if (mode === 'request') {
            <form [formGroup]="requestForm" (ngSubmit)="submitRequest()" class="d-flex flex-column gap-3">
              <div>
                <label class="text-xs-caps text-on-surface-variant mb-2">Account Email</label>
                <div class="input-group">
                  <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                    <span class="material-symbols-outlined fs-6">mail</span>
                  </span>
                  <input
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                    placeholder="Email address"
                  />
                </div>
              </div>

              <button class="btn btn-primary py-2" type="submit" [disabled]="loadingRequest">
                @if (loadingRequest) {
                  <span class="spinner-border spinner-border-sm"></span>
                } @else {
                  Request reset token
                }
              </button>
            </form>
          }

          @if (mode === 'reset') {
            <form [formGroup]="resetForm" (ngSubmit)="submitReset()" class="d-flex flex-column gap-3">
              <div>
                <label class="text-xs-caps text-on-surface-variant mb-2">Reset Token</label>
                <div class="input-group">
                  <input
                    [type]="showToken ? 'text' : 'password'"
                    formControlName="token"
                    autocomplete="one-time-code"
                    class="form-control bg-surface-container-low border-0 text-on-surface ps-3"
                    placeholder="Paste reset token"
                  />
                  <button
                    type="button"
                    class="input-group-text bg-surface-container-low border-0 text-on-surface-variant pwd-toggle"
                    (click)="showToken = !showToken"
                  >
                    <span class="material-symbols-outlined fs-6">{{ showToken ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>

              <div>
                <label class="text-xs-caps text-on-surface-variant mb-2">New Password</label>
                <div class="input-group">
                  <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                    <span class="material-symbols-outlined fs-6">lock</span>
                  </span>
                  <input
                    [type]="showPassword ? 'text' : 'password'"
                    formControlName="newPassword"
                    autocomplete="new-password"
                    class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                    placeholder="New password"
                  />
                  <button
                    type="button"
                    class="input-group-text bg-surface-container-low border-0 text-on-surface-variant pwd-toggle"
                    (click)="showPassword = !showPassword"
                  >
                    <span class="material-symbols-outlined fs-6">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                <div class="text-on-surface-variant mt-1" style="font-size: 10px;">Password must be 8+ characters with 1 uppercase, 1 digit, and 1 special character.</div>
              </div>

              <div>
                <label class="text-xs-caps text-on-surface-variant mb-2">Confirm New Password</label>
                <div class="input-group">
                  <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                    <span class="material-symbols-outlined fs-6">verified_user</span>
                  </span>
                  <input
                    [type]="showConfirmPassword ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    autocomplete="new-password"
                    class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    class="input-group-text bg-surface-container-low border-0 text-on-surface-variant pwd-toggle"
                    (click)="showConfirmPassword = !showConfirmPassword"
                  >
                    <span class="material-symbols-outlined fs-6">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>

              <button class="btn btn-primary py-2" type="submit" [disabled]="loadingReset">
                @if (loadingReset) {
                  <span class="spinner-border spinner-border-sm"></span>
                } @else {
                  Update password
                }
              </button>
            </form>
          }

          <div class="text-center mt-4">
            <a routerLink="/auth/login" class="btn btn-outline-primary px-4 py-2 action-pill-btn">Back to sign in</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .min-vh-75 { min-height: 75vh; }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .pwd-toggle { cursor: pointer; }
    .action-pill-btn {
      border-radius: 999px;
      letter-spacing: 0.08em;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      border-color: var(--outline-variant);
    }
  `],
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mode: 'request' | 'reset' = 'request';
  loadingRequest = false;
  loadingReset = false;
  showToken = false;
  showPassword = false;
  showConfirmPassword = false;
  devToken = '';

  requestForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  resetForm = this.fb.group({
    token: ['', [Validators.required]],
    newPassword: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.mode = 'reset';
      this.resetForm.patchValue({ token });
    }
  }

  submitRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      this.notifications.show('Please enter a valid email address.', 'warning', 3200);
      return;
    }

    this.loadingRequest = true;
    const email = this.requestForm.value.email as string;
    this.auth.requestPasswordReset(email).subscribe({
      next: (res) => {
        this.loadingRequest = false;
        this.notifications.show(res.data?.message ?? 'If your email exists, a reset link has been sent.', 'success', 4200);

        const token = res.data?.reset_token;
        if (token) {
          this.devToken = token;
          this.mode = 'reset';
          this.resetForm.patchValue({ token });
        }
      },
      error: (err) => {
        this.loadingRequest = false;
        this.notifications.show(err?.error?.message ?? 'Failed to request password reset.', 'error', 4500);
      },
    });
  }

  submitReset(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      this.notifications.show('Token and both password fields are required.', 'warning', 3200);
      return;
    }

    const token = this.resetForm.value.token as string;
    const newPassword = this.resetForm.value.newPassword as string;
    const confirmPassword = this.resetForm.value.confirmPassword as string;

    if (newPassword !== confirmPassword) {
      this.notifications.show('Passwords do not match.', 'warning', 3200);
      return;
    }

    if (!isStrongPassword(newPassword)) {
      this.notifications.show('Password must be 8+ characters with 1 uppercase, 1 digit, and 1 special character.', 'warning', 3800);
      return;
    }

    this.loadingReset = true;
    this.auth.resetPassword(token, newPassword, confirmPassword).subscribe({
      next: (res) => {
        this.loadingReset = false;
        this.notifications.show(res.data?.message ?? 'Password reset successful.', 'success', 3200);
        setTimeout(() => this.router.navigate(['/auth/login']), 800);
      },
      error: (err) => {
        this.loadingReset = false;
        this.notifications.show(err?.error?.message ?? 'Failed to reset password.', 'error', 4500);
      },
    });
  }

  maskDevToken(token: string): string {
    if (!token) return 'XXX';
    if (token.length <= 8) return 'XXX-SECURE-XXX';
    return `${token.slice(0, 4)}-XXX-SECURE-XXX-${token.slice(-4)}`;
  }

}
