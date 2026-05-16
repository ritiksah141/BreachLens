import { Injectable, signal } from '@angular/core';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

const HISTORY_KEY = 'bl_notif_history';
const UNREAD_KEY = 'bl_notif_unread';

export interface ToastAction {
  label: string;
  callback: () => void;
}

export interface AppNotification {
  id: number;
  message: string;
  level: NotificationLevel;
  timestamp: Date;
  action?: ToastAction;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _seed = Date.now();
  private _notifications = signal<AppNotification[]>([]);
  private _history = signal<AppNotification[]>(this._loadHistory());
  private _unreadCount = signal<number>(this._loadUnreadCount());

  /**
   * When true, new notifications are automatically marked as read (count doesn't increment).
   * This is toggled by the UI when the Security Feed panel is open.
   */
  readonly isReading = signal(false);

  readonly notifications = this._notifications.asReadonly();
  readonly history = this._history.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();

  show(
    message: string,
    level: NotificationLevel = 'info',
    durationMs = 4000,
    action?: ToastAction
  ): number {
    const id = ++this._seed;
    const notification: AppNotification = {
      id,
      message,
      level,
      action,
      timestamp: new Date()
    };

    // Active notifications (toasts)
    this._notifications.update((items) => [...items, notification]);

    // Persistent session history
    this._history.update((items) => {
      const newItems = [notification, ...items].slice(0, 50); // Keep last 50
      this._saveHistory(newItems);
      return newItems;
    });

    // Only increment unread count if the user isn't currently viewing the feed
    if (!this.isReading()) {
      this._unreadCount.update(c => {
        const newCount = c + 1;
        this._saveUnreadCount(newCount);
        return newCount;
      });
    }

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }

    return id;
  }

  dismiss(id: number): void {
    this._notifications.update((items) => items.filter((n) => n.id !== id));
  }

  markHistoryAsRead(): void {
    this._unreadCount.set(0);
    this._saveUnreadCount(0);
  }

  clearActive(): void {
    this._notifications.set([]);
  }

  clearHistory(): void {
    this._history.set([]);
    this._notifications.set([]);
    this._unreadCount.set(0);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(UNREAD_KEY);
  }

  private _loadHistory(): AppNotification[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    } catch {
      return [];
    }
  }

  private _saveHistory(items: AppNotification[]): void {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }

  private _loadUnreadCount(): number {
    const raw = localStorage.getItem(UNREAD_KEY);
    return raw ? parseInt(raw, 10) : 0;
  }

  private _saveUnreadCount(count: number): void {
    localStorage.setItem(UNREAD_KEY, count.toString());
  }
}
