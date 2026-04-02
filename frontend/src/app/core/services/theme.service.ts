import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'bl_theme';
  theme = signal<'dark' | 'light'>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme() {
    const newTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(newTheme);
    this.applyTheme(newTheme);
    localStorage.setItem(this.THEME_KEY, newTheme);
  }

  private getInitialTheme(): 'dark' | 'light' {
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  private applyTheme(theme: 'dark' | 'light') {
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}
