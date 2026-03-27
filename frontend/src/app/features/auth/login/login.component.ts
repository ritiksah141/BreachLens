import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  template: `
    <div class="row justify-content-center mt-5">
      <div class="col-md-5 col-lg-4">
        <div class="card bg-dark border-secondary">
          <div class="card-body p-4">
            <h4 class="fw-bold text-light mb-1">
              <span class="text-danger">⬡</span> Sign in
            </h4>
            <p class="text-muted small mb-4">Access BreachLens intelligence</p>

            @if (serverError) {
              <div class="alert alert-danger py-2 small">{{ serverError }}</div>
            }

            <form [formGroup]="form" (ngSubmit)="onSubmit()">
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
                  placeholder="••••••••"
                />
                @if (f['password'].invalid && f['password'].touched) {
                  <div class="invalid-feedback">Password required.</div>
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
                Sign in
              </button>
            </form>

            <hr class="border-secondary my-3" />
            <p class="text-center text-muted small mb-0">
              No account?
              <a routerLink="/auth/register" class="text-danger">Register</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

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
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.serverError =
          err?.error?.message ?? 'Login failed. Check your credentials.';
      },
    });
  }
}
