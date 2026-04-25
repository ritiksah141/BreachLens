import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

// Backend requires: min 8 chars, uppercase, digit, and special character
function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  if (!/(?=.*[A-Z])/.test(v)) return { noUppercase: true };
  if (!/(?=.*\d)/.test(v))    return { noDigit: true };
  if (!/(?=.*[^A-Za-z0-9])/.test(v)) return { noSpecial: true };
  if (v.length < 8)           return { minlength: true };
  return null;
}

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value ?? '';
  const confirmPassword = control.get('confirmPassword')?.value ?? '';

  if (!confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  template: `
    <div class="row justify-content-center align-items-center min-vh-75 mt-5">
      <div class="col-md-5 col-lg-4">
        <div class="text-center mb-5">
          <div class="register-brand-mark d-inline-flex mb-3" aria-hidden="true">
            <span class="register-brand-chip register-brand-chip-a">
              <span class="material-symbols-outlined register-brand-chip-icon">shield_person</span>
            </span>
            <span class="register-brand-chip register-brand-chip-b">
              <span class="material-symbols-outlined register-brand-chip-icon">person_add</span>
            </span>
          </div>
          <h1 class="font-headline fw-extrabold text-on-surface tracking-tighter mb-1">BreachLens</h1>
          <p class="text-xs-caps text-on-surface-variant">Sign Up</p>
        </div>

        <div class="glass-panel p-4 p-md-5 rounded-4 shadow-lg border border-outline-variant border-opacity-10 position-relative">
          <div class="position-absolute top-0 end-0 p-3 opacity-10">
            <span class="material-symbols-outlined fs-4 text-on-surface">person_add</span>
          </div>

          <header class="mb-4">
            <h2 class="font-headline fs-4 fw-bold text-on-surface mb-2">Create Account</h2>
            <p class="text-on-surface-variant small mb-0">Create an account to access more features.</p>
          </header>

          @if (serverError) {
            <div class="alert bg-error-container bg-opacity-10 border-error text-error py-2 small mb-4">
              <span class="material-symbols-outlined fs-6 me-2">error</span>
              {{ serverError }}
            </div>
          }
          @if (success) {
            <div class="alert bg-success-container bg-opacity-10 border-success text-success py-2 small mb-4">
              <span class="material-symbols-outlined fs-6 me-2">check_circle</span>
              Account created. Redirecting to sign in...
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="d-flex flex-column gap-4">
            <div>
              <label class="text-xs-caps text-on-surface-variant mb-2">Username</label>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">person</span>
                </span>
                <input
                  formControlName="username"
                  type="text"
                  class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                  [ngClass]="{ 'is-invalid': f['username'].invalid && f['username'].touched }"
                  placeholder="Username"
                />
              </div>
              @if (f['username'].errors?.['required'] && f['username'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">USERNAME REQUIRED</div>
              }
              @if (f['username'].errors?.['minlength'] && f['username'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">MINIMUM 3 CHARACTERS</div>
              }
              @if (f['username'].errors?.['pattern'] && f['username'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">LETTERS AND NUMBERS ONLY</div>
              }
            </div>

            <div>
              <label class="text-xs-caps text-on-surface-variant mb-2">Email</label>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">mail</span>
                </span>
                <input
                  formControlName="email"
                  type="email"
                  class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                  [ngClass]="{ 'is-invalid': f['email'].invalid && f['email'].touched }"
                  placeholder="Email Address"
                />
              </div>
              @if (f['email'].invalid && f['email'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">VALID EMAIL REQUIRED</div>
              }
            </div>

            <div>
              <label class="text-xs-caps text-on-surface-variant mb-2">Role</label>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">badge</span>
                </span>
                <select
                  formControlName="role"
                  class="form-select bg-surface-container-low border-0 ps-2 text-on-surface"
                >
                  <option value="guest">Guest</option>
                  <option value="analyst">Analyst</option>
                </select>
              </div>
              <div class="text-on-surface-variant mt-1" style="font-size: 10px;">Allowed roles: guest and analyst.</div>
            </div>

            <div>
              <label class="text-xs-caps text-on-surface-variant mb-2">Password</label>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">lock</span>
                </span>
                <input
                  formControlName="password"
                  [type]="showPassword ? 'text' : 'password'"
                  class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                  [ngClass]="{ 'is-invalid': f['password'].invalid && f['password'].touched }"
                  placeholder="Password"
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
              @if (f['password'].errors?.['minlength'] && f['password'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">AT LEAST 8 CHARACTERS</div>
              }
              @if (f['password'].errors?.['noUppercase'] && f['password'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">INCLUDE AN UPPERCASE LETTER</div>
              }
              @if (f['password'].errors?.['noDigit'] && f['password'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">INCLUDE A NUMBER</div>
              }
              @if (f['password'].errors?.['noSpecial'] && f['password'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">INCLUDE A SPECIAL CHARACTER</div>
              }
              <div class="text-on-surface-variant mt-1" style="font-size: 10px;">Password must be 8+ characters with 1 uppercase, 1 digit, and 1 special character.</div>
            </div>

            <div>
              <label class="text-xs-caps text-on-surface-variant mb-2">Confirm Password</label>
              <div class="input-group">
                <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                  <span class="material-symbols-outlined fs-6">verified_user</span>
                </span>
                <input
                  formControlName="confirmPassword"
                  [type]="showConfirmPassword ? 'text' : 'password'"
                  class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                  [ngClass]="{ 'is-invalid': (f['confirmPassword'].invalid && f['confirmPassword'].touched) || (form.hasError('passwordMismatch') && f['confirmPassword'].touched) }"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  class="input-group-text bg-surface-container-low border-0 text-on-surface-variant pwd-toggle"
                  (click)="toggleConfirmPasswordVisibility()"
                  [attr.aria-label]="showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'"
                >
                  <span class="material-symbols-outlined fs-6">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (f['confirmPassword'].errors?.['required'] && f['confirmPassword'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">CONFIRM PASSWORD REQUIRED</div>
              }
              @if (form.hasError('passwordMismatch') && f['confirmPassword'].touched) {
                <div class="text-error mt-1" style="font-size: 10px;">PASSWORDS MUST MATCH</div>
              }
            </div>

            <button
              class="btn btn-primary w-100 py-3 mt-2 d-flex align-items-center justify-content-center gap-2 register-submit-btn"
              type="submit"
              [disabled]="loading"
            >
              @if (loading) {
                <span class="spinner-border spinner-border-sm"></span>
              } @else {
                <span>Create account</span>
                <span class="material-symbols-outlined fs-5">person_add</span>
              }
            </button>
          </form>

          <footer class="mt-5 pt-4 border-top border-outline-variant border-opacity-10 text-center">
            <p class="text-on-surface-variant small mb-0">
              Already have an account?
            </p>
            <a routerLink="/auth/login" class="btn btn-outline-primary mt-3 px-4 py-2 sign-in-btn">Sign in</a>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .min-vh-75 { min-height: 75vh; }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .text-error { color: var(--error) !important; }
    .border-error { border-color: var(--error) !important; }
    .pwd-toggle { cursor: pointer; }
    .register-submit-btn {
      letter-spacing: 0.08em;
      font-weight: 700;
      border-radius: 0.8rem;
      box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 18%, transparent);
      transition: transform 140ms ease, box-shadow 140ms ease;
    }
    .register-submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 12px 28px color-mix(in srgb, var(--primary) 24%, transparent);
    }
    .sign-in-btn {
      border-radius: 999px;
      letter-spacing: 0.08em;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      border-color: var(--outline-variant);
    }
    .sign-in-btn:hover {
      border-color: var(--primary);
      color: var(--on-surface);
      background: var(--surface-container-high);
    }
    .register-brand-mark {
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
    .register-brand-mark::before {
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
    .register-brand-chip {
      position: relative;
      z-index: 1;
      width: 20px;
      height: 34px;
      border-radius: 0.55rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      border: 1px solid var(--outline-variant);
      background: var(--surface-container-lowest);
      text-shadow: 0 0 8px color-mix(in srgb, var(--primary) 20%, transparent);
    }
    .register-brand-chip-icon {
      font-size: 13px;
      font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 20;
      line-height: 1;
    }
    .register-brand-chip-a { transform: rotate(-8deg) translateY(-1px); }
    .register-brand-chip-b { transform: rotate(8deg) translateY(1px); }
    :host-context([data-theme='light']) .register-brand-mark {
      box-shadow: 0 0 12px color-mix(in srgb, var(--primary) 10%, transparent);
    }
    :host-context([data-theme='light']) .register-brand-mark::before {
      opacity: 0.32;
    }
    :host-context([data-theme='light']) .register-brand-chip {
      text-shadow: none;
    }
  `]
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notifications = inject(NotificationService);

  loading = false;
  serverError = '';
  success = false;
  showPassword = false;
  showConfirmPassword = false;

  form = this.fb.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_]+$/),
      ],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrength]],
    confirmPassword: ['', [Validators.required]],
    role: ['guest', [Validators.required]],
  }, { validators: passwordsMatch });
  ngOnInit(): void {
    const requestedRole = this.route.snapshot.queryParamMap.get('role');
    if (requestedRole === 'guest' || requestedRole === 'analyst') {
      this.form.patchValue({ role: requestedRole });
    }
  }


  get f() {
    return this.form.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.hasError('passwordMismatch')) {
        this.notifications.show('Passwords do not match. Please confirm your password.', 'warning', 3500);
        return;
      }
      this.notifications.show('Please fix the highlighted form errors.', 'warning', 3500);
      return;
    }
    this.loading = true;
    this.serverError = '';

    const { confirmPassword, ...payload } = this.form.getRawValue();

    this.auth.register(payload as any).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.notifications.show('Account created successfully. Redirecting to login...', 'success', 2500);
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.serverError =
          err?.error?.message ?? 'Registration failed. Username or email may be taken.';
        this.notifications.show(this.serverError, 'error', 5000);
      },
    });
  }
}
