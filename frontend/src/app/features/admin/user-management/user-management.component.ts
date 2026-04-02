import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  template: `
    <div class="card border-0 bg-surface-container-low shadow-lg overflow-hidden">
      <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center">
        <span class="text-xs-caps text-white">Operator_Management_Console</span>
        @if (loading) {
          <div class="spinner-border spinner-border-sm text-primary"></div>
        }
      </div>
      <div class="card-body p-0">
        @if (error) {
          <div class="alert bg-error-container bg-opacity-10 border-error text-error m-3 small text-xs-caps">
            <span class="material-symbols-outlined fs-6 me-2">error</span> {{ error }}
          </div>
        }
        @if (success) {
          <div class="alert bg-success-container bg-opacity-10 border-success text-success m-3 small text-xs-caps">
            <span class="material-symbols-outlined fs-6 me-2">check_circle</span> {{ success }}
          </div>
        }

        <div class="table-responsive">
          <table class="table table-dark table-hover mb-0 align-middle custom-terminal-table">
            <thead>
              <tr class="bg-surface-container-low">
                <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Identifier</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Access_Level</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Connectivity</th>
                <th class="pe-4 text-end text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Operations</th>
              </tr>
            </thead>
            <tbody class="border-top-0">
              @for (user of users; track user._id) {
                <tr class="bg-transparent border-bottom border-outline-variant border-opacity-10">
                  <td class="ps-4">
                    <div class="d-flex align-items-center gap-3 py-1">
                      <div class="p-2 bg-surface-container-highest rounded-circle position-relative">
                        <span class="material-symbols-outlined text-on-surface-variant fs-5">person</span>
                        @if (user.is_active) {
                          <span class="position-absolute bottom-0 end-0 p-1 bg-success rounded-circle border border-dark"></span>
                        }
                      </div>
                      <div>
                        <div class="fw-bold text-white small">{{ user.username }}</div>
                        <div class="text-on-surface-variant font-mono" style="font-size: 9px;">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      class="form-select bg-surface-container border-0 text-xs-caps py-1 px-2"
                      [value]="user.role"
                      (change)="onRoleChange(user._id, $event)"
                      [disabled]="user._id === auth.currentUser()?._id"
                      style="font-size: 9px; width: auto;"
                    >
                      <option value="guest">GUEST_ACCESS</option>
                      <option value="analyst">ANALYST_LEVEL</option>
                      <option value="admin">ROOT_ADMIN</option>
                    </select>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="p-1 rounded-circle" [ngClass]="user.is_active ? 'bg-success animate-pulse' : 'bg-on-surface-variant opacity-25'"></span>
                      <span class="text-xs-caps fw-bold" [ngClass]="user.is_active ? 'text-success' : 'text-on-surface-variant'">
                        {{ user.is_active ? 'ONLINE' : 'OFFLINE' }}
                      </span>
                    </div>
                  </td>
                  <td class="pe-4 text-end">
                    <button
                      class="btn btn-dark bg-opacity-10 text-xs-caps py-1 px-3 border-0 transition-all"
                      [ngClass]="user.is_active ? 'text-error hover-bg-error' : 'text-success hover-bg-success'"
                      (click)="toggleStatus(user)"
                      [disabled]="user._id === auth.currentUser()?._id"
                      style="font-size: 8px;"
                    >
                      {{ user.is_active ? 'TERMINATE_ACCESS' : 'RESTORE_ACCESS' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <div class="p-3 border-top border-outline-variant border-opacity-10">
        <app-pagination
          [currentPage]="page"
          [totalPages]="totalPages"
          (pageChange)="onPageChange($event)"
        />
      </div>
    </div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .custom-terminal-table tr:hover { background-color: rgba(123, 208, 255, 0.03) !important; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
    .text-error { color: var(--error) !important; }
    .text-success { color: #4ade80 !important; }
    .bg-success { background-color: #4ade80 !important; }
    .bg-error-container { background-color: #93000a; }
    .bg-success-container { background-color: #0a1a10; }
    .border-error { border-color: var(--error) !important; }
    .border-success { border-color: #4ade80 !important; }
    .hover-bg-error:hover { background-color: rgba(248, 113, 113, 0.1) !important; }
    .hover-bg-success:hover { background-color: rgba(74, 222, 128, 0.1) !important; }
  `]
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
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
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to update role.';
        this.loadUsers();
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
      },
      error: (err) => {
        this.error = err?.error?.message ?? `Failed to ${action} user.`;
      }
    });
  }
}
