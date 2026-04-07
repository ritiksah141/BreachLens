import { Routes } from '@angular/router';
import { authGuard, analystGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'breaches',
    loadComponent: () =>
      import('./features/breaches/breach-list/breach-list.component').then(
        (m) => m.BreachListComponent
      ),
  },
  {
    path: 'breaches/:id',
    loadComponent: () =>
      import('./features/breaches/breach-detail/breach-detail.component').then(
        (m) => m.BreachDetailComponent
      ),
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/breaches/breach-map/breach-map.component').then(
        (m) => m.BreachMapComponent
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  {
    path: 'auth/profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
