import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UpperCasePipe],
  template: `
    <nav class="navbar navbar-expand-lg bg-surface-container border-bottom border-outline-variant">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold text-on-surface" routerLink="/">
          <span class="text-error">⬡</span> BreachLens
        </a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMain"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarMain">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <a class="nav-link text-on-surface-variant" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
                Dashboard
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-on-surface-variant" routerLink="/breaches" routerLinkActive="active">
                Breaches
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-on-surface-variant" routerLink="/map" routerLinkActive="active">
                Global Map
              </a>
            </li>
            @if (auth.isAnalyst()) {
              <li class="nav-item">
                <a class="nav-link text-on-surface-variant" routerLink="/analytics" routerLinkActive="active">
                  Analytics
                </a>
              </li>
            }
            @if (auth.isAdmin()) {
              <li class="nav-item">
                <a class="nav-link text-on-surface-variant" routerLink="/admin" routerLinkActive="active">
                  Admin
                </a>
              </li>
            }
          </ul>
          <ul class="navbar-nav ms-auto">
            @if (auth.isAuthenticated()) {
              <li class="nav-item dropdown">
                <a
                  class="nav-link dropdown-toggle text-on-surface"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                >
                  <span class="badge bg-success me-1">
                    {{ auth.currentUser()?.role | uppercase }}
                  </span>
                  {{ auth.currentUser()?.username }}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li>
                    <a class="dropdown-item" routerLink="/auth/profile">Profile</a>
                  </li>
                  <li><hr class="dropdown-divider" /></li>
                  <li>
                    <button class="dropdown-item text-error" (click)="logout()">
                      Logout
                    </button>
                  </li>
                </ul>
              </li>
            } @else {
              <li class="nav-item">
                <a class="nav-link text-on-surface-variant" routerLink="/auth/login">Login</a>
              </li>
              <li class="nav-item">
                <a class="nav-link btn btn-outline-danger btn-sm ms-2 px-3" routerLink="/auth/register">
                  Register
                </a>
              </li>
            }
          </ul>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  auth = inject(AuthService);

  logout() {
    this.auth.logout();
  }
}
