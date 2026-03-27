import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

// Backend requires: min 8 chars, at least one uppercase, at least one digit
function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  if (!/(?=.*[A-Z])/.test(v)) return { noUppercase: true };
  if (!/(?=.*\d)/.test(v))    return { noDigit: true };
  if (v.length < 8)           return { minlength: true };
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  template: `
    <div class="row justify-content-center mt-5">
      <div class="col-md-5 col-lg-4">
        <div class="card bg-dark border-secondary">
          <div class="card-body p-4">
            <h4 class="fw-bold text-light mb-1">
              <span class="text-danger">⬡</span> Create account
            </h4>
            <p class="text-muted small mb-4">Join BreachLens</p>

            @if (serverError) {
              <div class="alert alert-danger py-2 small">{{ serverError }}</div>
            }
            @if (success) {
              <div class="alert alert-success py-2 small">
                Account created! <a routerLink="/auth/login" class="alert-link">Sign in →</a>
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="mb-3">
                <label class="form-label text-muted small">Username</label>
                <input
                  formControlName="username"
                  type="text"
                  class="form-control bg-dark text-light border-secondary"
                  [ngClass]="{ 'is-invalid': f['username'].invalid && f['username'].touched }"
                  placeholder="john_doe"
                />
                @if (f['username'].errors?.['required'] && f['username'].touched) {
                  <div class="invalid-feedback">Username required.</div>
                }
                @if (f['username'].errors?.['minlength'] && f['username'].touched) {
                  <div class="invalid-feedback">Min 3 characters.</div>
                }
                @if (f['username'].errors?.['pattern'] && f['username'].touched) {
                  <div class="invalid-feedback">Letters, numbers and underscores only.</div>
                }
              </div>

              <div class="mb-3">
                <label class="form-label text-muted small">Email</label>
                <input
                  formControlName="email"
                  type="email"
                  class="form-control bg-dark text-light border-secondary"
                  [ngClass]="{ 'is-invalid': f['email'].invalid && f['email'].touched }"
                  placeholder="you@example.com"
                />
                @if (f['email'].invalid && f['email'].touched) {
                  <div class="invalid-feedback">Valid email required.</div>
                }
              </div>

              <div class="mb-4">
                <label class="form-label text-muted small">Password</label>
                <input
                  formControlName="password"
                  type="password"
                  class="form-control bg-dark text-light border-secondary"
                  [ngClass]="{ 'is-invalid': f['password'].invalid && f['password'].touched }"
                  placeholder="Min 8 chars, 1 uppercase, 1 digit"
                />
                @if (f['password'].errors?.['minlength'] && f['password'].touched) {
                  <div class="invalid-feedback">At least 8 characters.</div>
                }
                @if (f['password'].errors?.['noUppercase'] && f['password'].touched) {
                  <div class="invalid-feedback">Must include an uppercase letter.</div>
                }
                @if (f['password'].errors?.['noDigit'] && f['password'].touched) {
                  <div class="invalid-feedback">Must include a number.</div>
                }
              </div>

              <button
                class="btn btn-danger w-100"
                type="submit"
                [disabled]="loading"
              >
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                Create account
              </button>
            </form>

            <hr class="border-secondary my-3" />
            <p class="text-center text-muted small mb-0">
              Have an account?
              <a routerLink="/auth/login" class="text-danger">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  serverError = '';
  success = false;

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

    this.auth.register(this.form.value as any).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.serverError =
          err?.error?.message ?? 'Registration failed. Username or email may be taken.';
      },
    });
  }
}
