import { Component, OnInit, AfterViewInit, OnDestroy, inject, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BreachService } from '../../../core/services/breach.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';

@Component({
  selector: 'app-breach-map',
  standalone: true,
  imports: [CommonModule, SeverityBadgeComponent],
  template: `
    <div class="d-flex justify-content-between align-items-end mb-4 mt-2">
      <div>
        <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title">Global Incursion Map</h2>
        <p class="page-subtitle mb-0">Geospatial threat visualization</p>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3" (click)="useMyLocation()" [disabled]="geoLoading">
          @if (geoLoading) { <span class="spinner-border spinner-border-sm me-1"></span> }
          <span class="material-symbols-outlined fs-6 me-1">my_location</span> Near me
        </button>
        <select #sevSelect class="form-select bg-surface-container border-0 text-xs-caps py-2"
                style="width: auto; font-size: 10px;" (change)="filterBySeverity(sevSelect.value)">
          <option value="">All severities</option>
          <option value="critical">CRITICAL</option>
          <option value="high">HIGH</option>
          <option value="medium">MEDIUM</option>
          <option value="low">LOW</option>
        </select>
        <button class="btn btn-primary text-xs-caps py-2 px-3" (click)="loadGeoJson()">
          <span class="material-symbols-outlined fs-6">refresh</span>
        </button>
      </div>
    </div>

    @if (geoError) {
      <div class="alert bg-error-container bg-opacity-10 border-error text-error py-2 small mb-3 animate__animated animate__shakeX text-xs-caps">
        <span class="material-symbols-outlined fs-6 me-2">warning</span> {{ geoError }}
      </div>
    }

    <div class="card border-0 bg-surface-container-low position-relative overflow-hidden shadow-lg" style="height: calc(100vh - 220px);">
      <!-- Subtle Overlay for high-end look -->
      <div class="position-absolute inset-0 pointer-events-none z-1 opacity-5"
           style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 30px 30px;"></div>

      <div #mapContainer id="global-map" style="height: 100%; width: 100%;"></div>

      <!-- Bottom Legend Micro-Panel -->
      <div class="position-absolute bottom-0 start-0 m-3 z-3 glass-panel p-2 rounded-2 border border-outline-variant border-opacity-10">
        <div class="d-flex gap-3 px-2">
          <div class="d-flex align-items-center gap-2">
            <span class="p-1 rounded-circle bg-error shadow-error"></span>
            <span class="text-xs-caps text-on-surface" style="font-size: 8px;">Critical</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="p-1 rounded-circle" style="background: #fb923c;"></span>
            <span class="text-xs-caps text-on-surface" style="font-size: 8px;">High</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="p-1 rounded-circle" style="background: #fbbf24;"></span>
            <span class="text-xs-caps text-on-surface" style="font-size: 8px;">Medium</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="p-1 rounded-circle bg-primary shadow-primary"></span>
            <span class="text-xs-caps text-on-surface" style="font-size: 8px;">Low</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    #global-map { background: var(--background) !important; }
    .shadow-error { box-shadow: 0 0 10px rgba(248, 113, 113, 0.5); }
    .shadow-primary { box-shadow: 0 0 10px rgba(123, 208, 255, 0.5); }

    ::ng-deep .bl-popup .leaflet-popup-content-wrapper {
      background: var(--surface-container-high) !important;
      color: var(--on-surface) !important;
      border: 1px solid var(--outline-variant) !important;
      border-radius: 8px !important;
      padding: 0 !important;
    }
    ::ng-deep .bl-popup .leaflet-popup-tip { background: var(--surface-container-high) !important; }
    ::ng-deep .bl-popup .leaflet-popup-content { margin: 12px !important; }
  `]
})
export class BreachMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private breachService = inject(BreachService);
  private themeService = inject(ThemeService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private map: any;
  private geoJsonLayer: any;
  private tileLayer: any;

  geoLoading = false;
  geoError = '';

  private _themeWatcher = effect(() => {
    this.themeService.theme();
    if (this.map) this.updateTileLayer();
  });

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private async initMap() {
    const L = await import('leaflet' as any);

    this.map = L.map(this.mapContainer.nativeElement).setView([20, 0], 2);
    this.updateTileLayer();

    this.loadGeoJson();
  }

  private async updateTileLayer() {
    const L = await import('leaflet' as any);
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);

    const isDark = this.themeService.theme() === 'dark';
    const url = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    this.tileLayer = L.tileLayer(url, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);
  }

  loadGeoJson(severity?: string) {
    this.breachService.getGeoJson(severity).subscribe({
      next: (res) => {
        this.renderMarkers(res.data);
      },
      error: (err) => {
        this.geoError = err?.error?.message ?? 'Failed to load map telemetry.';
        this.notifications.show(this.geoError, 'error', 4500);
      }
    });
  }

  filterBySeverity(severity: string) {
    this.loadGeoJson(severity);
  }

  useMyLocation() {
    if (!navigator.geolocation) {
      this.geoError = 'Geolocation not supported.';
      this.notifications.show(this.geoError, 'warning', 3200);
      return;
    }

    this.geoLoading = true;
    this.geoError = '';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        this.map.setView([latitude, longitude], 10);

        this.breachService.getNear(longitude, latitude).subscribe({
          next: (res) => {
            this.renderMarkers(res.data);
            this.geoLoading = false;
            this.notifications.show('Loaded nearby breaches.', 'success', 2500);
          },
          error: (err) => {
            this.geoError = err?.error?.message ?? 'Failed to load local breaches.';
            this.geoLoading = false;
            this.notifications.show(this.geoError, 'error', 4500);
          }
        });
      },
      () => {
        this.geoError = 'Location access denied or unavailable.';
        this.geoLoading = false;
        this.notifications.show(this.geoError, 'warning', 3500);
      }
    );
  }

  private async renderMarkers(geoData: any) {
    const L = await import('leaflet' as any);
    if (this.geoJsonLayer) this.map.removeLayer(this.geoJsonLayer);

    const colorMap: any = {
      critical: '#ffb3b0',
      high: '#fb923c',
      medium: '#fbbf24',
      low: '#7bd0ff',
      informational: '#88929b'
    };

    this.geoJsonLayer = L.geoJSON(geoData, {
      pointToLayer: (feature: any, latlng: any) => {
        const sev = feature.properties.severity?.toLowerCase() || 'medium';
        return L.circleMarker(latlng, {
          radius: Math.max(6, Math.min(15, (feature.properties.risk_score || 5) * 1.5)),
          fillColor: colorMap[sev],
          color: '#fff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      onEachFeature: (feature: any, layer: any) => {
        const props = feature.properties;
        layer.bindPopup(`
          <div class="text-on-surface">
            <div class="text-xs-caps fw-bold mb-1" style="font-size: 10px;">${props.title}</div>
            <div class="small mb-3 d-flex align-items-center gap-2">
              <span class="badge py-1 px-2 border border-outline-variant border-opacity-25 text-xs-caps" style="font-size: 7px; background: var(--surface-container-low); color: var(--on-surface)">${props.severity?.toUpperCase()}</span>
              <span class="text-on-surface-variant fw-bold" style="font-size: 8px; text-transform: uppercase;">${props.industry}</span>
            </div>
            <button class="btn btn-primary w-100 py-1 text-xs-caps" style="font-size: 8px;" id="popup-btn-${props.id}">DECRYPT_DATA</button>
          </div>
        `, { className: 'bl-popup' });

        layer.on('popupopen', () => {
          setTimeout(() => {
            document.getElementById(`popup-btn-${props.id}`)?.addEventListener('click', () => {
              this.router.navigate(['/breaches', props.id]);
            });
          }, 0);
        });
      }
    }).addTo(this.map);

    if (geoData.features && geoData.features.length > 0 && this.map.getZoom() < 4) {
      this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [50, 50] });
    }
  }
}
