import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appRequireRole]',
  standalone: true
})
export class RequireRoleDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private auth = inject(AuthService);

  private hasView = false;
  private requiredRoles: string[] = [];

  @Input() set appRequireRole(roles: string | string[]) {
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  private _watcher = effect(() => {
    this.auth.currentUser();
    this.updateView();
  });

  private updateView(): void {
    const user = this.auth.currentUser();
    const role = user?.role || '';
    const isAdmin = user?.admin === true;
    const hasAccess = this.requiredRoles.some(r =>
      r === role || (r === 'admin' && isAdmin)
    );

    if (hasAccess && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
