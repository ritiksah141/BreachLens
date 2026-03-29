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
    <div class="card bg-dark border-secondary">
      <div class="card-header border-secondary d-flex justify-content-between align-items-center">
        <strong class="text-light">User Management</strong>
        @if (loading) {
          <div class="spinner-border spinner-border-sm text-danger"></div>
        }
      </div>
      <div class="card-body p-0">
        @if (error) {
          <div class="alert alert-danger m-3 small">{{ error }}</div>
        }
        @if (success) {
          <div class="alert alert-success m-3 small">{{ success }}</div>
        }

        <div class="table-responsive">
          <table class="table table-dark table-hover mb-0 small">
            <thead>
              <tr class="text-muted">
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users; track user._id) {
                <tr>
                  <td class="text-light">{{ user.username }}</td>
                  <td class="text-muted">{{ user.email }}</td>
                  <td>
                    <select
                      class="form-select form-select-sm bg-dark text-light border-secondary"
                      [value]="user.role"
                      (change)="onRoleChange(user._id, $event)"
                      [disabled]="user._id === auth.currentUser()?._id"
                    >
                      <option value="guest">Guest</option>
                      <option value="analyst">Analyst</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="user.is_active ? 'bg-success' : 'bg-danger'">
                      {{ user.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="text-end">
                    <button
                      class="btn btn-sm"
                      [ngClass]="user.is_active ? 'btn-outline-danger' : 'btn-outline-success'"
                      (click)="toggleStatus(user)"
                      [disabled]="user._id === auth.currentUser()?._id"
                    >
                      {{ user.is_active ? 'Deactivate' : 'Activate' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer border-secondary">
        <app-pagination
          [currentPage]="page"
          [totalPages]="totalPages"
          (pageChange)="onPageChange($event)"
        />
      </div>
    </div>
  `,
  styles: [`
    table th { font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; border-bottom-width: 2px; }
    table td { vertical-align: middle; border-color: rgba(255,255,255,0.05); }
    .form-select-sm { width: auto; min-width: 100px; display: inline-block; }
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
