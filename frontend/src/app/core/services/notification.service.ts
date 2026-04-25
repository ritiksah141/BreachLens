import { Injectable, signal } from '@angular/core';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  callback: () => void;
}

export interface AppNotification {
  id: number;
  message: string;
  level: NotificationLevel;
  action?: ToastAction;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _seed = 0;
  private _notifications = signal<AppNotification[]>([]);

  readonly notifications = this._notifications.asReadonly();

  show(
    message: string,
    level: NotificationLevel = 'info',
    durationMs = 4000,
    action?: ToastAction
  ): number {
    const id = ++this._seed;
    this._notifications.update((items) => [
      ...items,
      { id, message, level, action },
    ]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }

    return id;
  }

  dismiss(id: number): void {
    this._notifications.update((items) => items.filter((n) => n.id !== id));
  }

  clear(): void {
    this._notifications.set([]);
  }
}
