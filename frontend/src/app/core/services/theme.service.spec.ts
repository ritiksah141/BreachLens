import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  function clearThemeState(): void {
    localStorage.removeItem('bl_theme');
    document.documentElement.removeAttribute('data-bs-theme');
    document.documentElement.removeAttribute('data-theme');
  }

  afterEach(() => {
    clearThemeState();
  });

  /**
   * Helper: creates the service inside a fresh TestBed so constructor
   * logic (which reads localStorage / matchMedia) runs with the
   * desired preconditions.
   */
  function createService(): ThemeService {
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  }

  describe('initial theme detection', () => {
    it('should use "dark" from localStorage when saved', () => {
      localStorage.setItem('bl_theme', 'dark');
      service = createService();
      expect(service.theme()).toBe('dark');
    });

    it('should use "light" from localStorage when saved', () => {
      localStorage.setItem('bl_theme', 'light');
      service = createService();
      expect(service.theme()).toBe('light');
    });

    it('should fall back to system preference when localStorage is empty (prefers light)', () => {
      localStorage.removeItem('bl_theme');
      spyOn(window, 'matchMedia').and.returnValue({
        matches: true,
      } as MediaQueryList);
      service = createService();
      expect(service.theme()).toBe('light');
    });

    it('should fall back to "dark" when system prefers dark', () => {
      localStorage.removeItem('bl_theme');
      spyOn(window, 'matchMedia').and.returnValue({
        matches: false,
      } as MediaQueryList);
      service = createService();
      expect(service.theme()).toBe('dark');
    });

    it('should ignore invalid localStorage values and use system preference', () => {
      localStorage.setItem('bl_theme', 'invalid-value');
      spyOn(window, 'matchMedia').and.returnValue({
        matches: true,
      } as MediaQueryList);
      service = createService();
      expect(service.theme()).toBe('light');
    });
  });

  describe('applyTheme on construction', () => {
    it('should set data-bs-theme and data-theme attributes on <html>', () => {
      localStorage.setItem('bl_theme', 'dark');
      service = createService();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('toggleTheme()', () => {
    beforeEach(() => {
      localStorage.setItem('bl_theme', 'dark');
      service = createService();
    });

    it('should switch from dark to light', () => {
      service.toggleTheme();
      expect(service.theme()).toBe('light');
    });

    it('should switch from light back to dark on second toggle', () => {
      service.toggleTheme(); // dark -> light
      service.toggleTheme(); // light -> dark
      expect(service.theme()).toBe('dark');
    });

    it('should persist the new theme in localStorage', () => {
      service.toggleTheme();
      expect(localStorage.getItem('bl_theme')).toBe('light');
      service.toggleTheme();
      expect(localStorage.getItem('bl_theme')).toBe('dark');
    });

    it('should update data-bs-theme attribute on <html>', () => {
      service.toggleTheme();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
    });

    it('should update data-theme attribute on <html>', () => {
      service.toggleTheme();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });
});
