import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  template: `
    <div class="glass-panel border-0 shadow-lg overflow-hidden animate__animated animate__fadeIn">
      <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
        <span class="text-xs-caps text-on-surface fw-bold" style="font-size: 8px;">OPERATOR MANAGEMENT CONSOLE</span>
        @if (loading) {
          <div class="spinner-border spinner-border-sm text-primary"></div>
        }
      </div>
      <div class="card-body p-0">
        @if (error) {
          <div class="alert bg-error-container bg-opacity-10 border-error text-error m-3 small text-xs-caps fw-bold" style="font-size: 7px; border: 0; border-start: 4px solid var(--error);">
            <span class="material-symbols-outlined fs-6 me-2">error</span> {{ error | uppercase }}
          </div>
        }
        @if (success) {
          <div class="alert bg-success-container bg-opacity-10 border-success text-success m-3 small text-xs-caps fw-bold" style="font-size: 7px; border: 0; border-start: 4px solid var(--success);">
            <span class="material-symbols-outlined fs-6 me-2">check_circle</span> {{ success | uppercase }}
          </div>
        }

        <div class="table-responsive custom-scrollbar-hidden">
          <table class="table table-hover mb-0 align-middle">
            <thead>
              <tr class="bg-surface-container-low">
                <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">IDENTIFIER</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">ACCESS LEVEL</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">CONNECTIVITY</th>
                <th class="pe-4 text-end text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">OPERATIONS</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users; track user._id) {
                <tr class="bg-transparent border-bottom border-outline-variant border-opacity-5 transition-all hover-bg-surface-container-high">
                  <td class="ps-4">
                    <div class="d-flex align-items-center gap-3 py-1">
                      <div class="p-2 bg-surface-container-highest rounded-circle position-relative shadow-sm" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined text-primary fs-6">person</span>
                        @if (user.is_active) {
                          <span class="position-absolute bottom-0 end-0 p-1 bg-success rounded-circle border border-surface shadow-sm" style="width: 8px; height: 8px;"></span>
                        }
                      </div>
                      <div>
                        <div class="fw-bold text-on-surface small" style="font-size: 11px;">{{ user.username }}</div>
                        <div class="text-on-surface-variant font-mono opacity-50" style="font-size: 7px;">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      class="form-select bg-surface-container-high border-0 text-on-surface py-1 px-2"
                      [value]="user.role"
                      (change)="onRoleChange(user._id, $event)"
                      [disabled]="user._id === auth.currentUser()?._id"
                      style="font-size: 9px; width: auto; height: 30px; min-width: 130px;"
                    >
                      <option value="guest">GUEST ACCESS</option>
                      <option value="analyst">ANALYST LEVEL</option>
                      <option value="admin">ROOT ADMIN</option>
                    </select>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="p-1 rounded-circle shadow-sm" [ngClass]="user.is_active ? 'bg-success animate-pulse' : 'bg-on-surface-variant opacity-25'" style="width: 6px; height: 6px;"></span>
                      <span class="text-xs-caps fw-bold" [ngClass]="user.is_active ? 'text-success' : 'text-on-surface-variant opacity-50'" style="font-size: 7px;">
                        {{ user.is_active ? 'ONLINE' : 'OFFLINE' }}
                      </span>
                    </div>
                  </td>
                  <td class="pe-4 text-end">
                    <button
                      class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-3 shadow-sm transition-all fw-bold"
                      [ngClass]="user.is_active ? 'text-error' : 'text-success'"
                      (click)="toggleStatus(user)"
                      [disabled]="user._id === auth.currentUser()?._id"
                      style="font-size: 7px; height: 30px;"
                    >
                      {{ user.is_active ? 'DEACTIVATE' : 'ACTIVATE' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <div class="p-3 border-top border-outline-variant border-opacity-10 bg-surface-container-low">
        <app-pagination [currentPage]="page" [totalPages]="totalPages" (pageChange)="onPageChange($event)" />
      </div>
    </div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

    .hover-bg-surface-container-high:hover {
       background-color: var(--surface-container-high) !important;
    }

    .custom-scrollbar-hidden::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar-hidden::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
    .custom-scrollbar-hidden:hover::-webkit-scrollbar-thumb { background: var(--outline-variant); }
  `]
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private notifications = inject(NotificationService);
  auth = inject(AuthService);

  users: User[] = [];
  page = 1;
  totalPages = 1;
  loading = false;
  error = '';
  success = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.listAllUsers(this.page).subscribe({
      next: (res) => {
        this.users = res.data;
        this.totalPages = res.meta?.total_pages ?? 1;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to load users.';
        this.loading = false;
        this.notifications.show(this.error, 'error', 4500);
      }
    });
  }

  onPageChange(p: number): void {
    this.page = p;
    this.loadUsers();
  }

  onRoleChange(userId: string, event: any): void {
    const newRole = event.target.value;
    if (!confirm(`Change role to ${newRole}?`)) {
      this.loadUsers(); // Reset select
      return;
    }

    this.adminService.changeUserRole(userId, newRole).subscribe({
      next: () => {
        this.success = 'User role updated.';
        this.loadUsers();
        this.notifications.show(this.success, 'success', 2500);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to update role.';
        this.loadUsers();
        this.notifications.show(this.error, 'error', 5000);
      }
    });
  }

  toggleStatus(user: User): void {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    const req$ = user.is_active
      ? this.adminService.deactivateUser(user._id)
      : this.adminService.activateUser(user._id);

    req$.subscribe({
      next: () => {
        this.success = `User ${action}d successfully.`;
        this.loadUsers();
        this.notifications.show(this.success, 'success', 2500);
      },
      error: (err) => {
        this.error = err?.error?.message ?? `Failed to ${action} user.`;
        this.notifications.show(this.error, 'error', 5000);
      }
    });
  }
}
