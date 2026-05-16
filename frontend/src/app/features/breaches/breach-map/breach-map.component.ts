import { Component, OnInit, AfterViewInit, OnDestroy, inject, ElementRef, ViewChild, effect, Input } from '@angular/core';
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
    <div class="map-wrapper" [style.height]="height">
      <div #mapContainer id="global-map" style="height: 100%; width: 100%; border-radius: 8px; overflow: hidden;"></div>

      <!-- Map Controls Overlay (Tactical HUD Style) -->
      <div class="position-absolute bottom-0 start-0 m-3 z-3 d-flex flex-column gap-2" style="z-index: 1001 !important; margin-bottom: 50px !important;">
        <div class="glass-panel p-1 d-flex flex-column gap-1 border border-outline-variant border-opacity-20 shadow-lg" style="border-radius: 12px;">
          <div class="tactical-tooltip-wrapper">
             <button class="btn btn-tactical-map" (click)="zoomIn()"><span class="material-symbols-outlined fs-6">add</span></button>
             <span class="tactical-tooltip">ZOOM IN</span>
          </div>
          <div class="tactical-tooltip-wrapper">
             <button class="btn btn-tactical-map" (click)="zoomOut()"><span class="material-symbols-outlined fs-6">remove</span></button>
             <span class="tactical-tooltip">ZOOM OUT</span>
          </div>
          <div class="border-top border-outline-variant border-opacity-10 my-1 mx-2"></div>
          <div class="tactical-tooltip-wrapper">
             <button class="btn btn-tactical-map" (click)="toggleViewportSync()" [class.active]="viewportSync"><span class="material-symbols-outlined fs-6">sync_alt</span></button>
             <span class="tactical-tooltip">{{ viewportSync ? 'SYNC ACTIVE' : 'SYNC VIEWPORT' }}</span>
          </div>
          <div class="tactical-tooltip-wrapper">
             <button class="btn btn-tactical-map" (click)="useMyLocation()" [disabled]="geoLoading">
                <span class="material-symbols-outlined fs-6" *ngIf="!geoLoading">my_location</span>
                <span class="spinner-border spinner-border-sm" *ngIf="geoLoading" style="width: 12px; height: 12px;"></span>
             </button>
             <span class="tactical-tooltip">LOCAL SCAN</span>
          </div>
          <div class="tactical-tooltip-wrapper">
             <button class="btn btn-tactical-map" (click)="refreshMap()" [disabled]="geoLoading">
                <span class="material-symbols-outlined fs-6" *ngIf="!geoLoading">refresh</span>
                <span class="spinner-border spinner-border-sm" *ngIf="geoLoading" style="width: 12px; height: 12px;"></span>
             </button>
             <span class="tactical-tooltip">SYNC RECORDS</span>
          </div>
        </div>
      </div>

      <!-- Bottom Legend -->
      <div class="position-absolute bottom-0 start-0 m-2 glass-panel p-1 rounded-2 border border-outline-variant border-opacity-20 shadow-lg" style="z-index: 1001 !important;">
        <div class="d-flex gap-2 px-1 align-items-center">
          <div class="d-flex align-items-center gap-1">
            <span class="p-1 rounded-circle bg-severity-critical" style="box-shadow: 0 0 5px var(--severity-critical)"></span>
            <span class="text-xs-caps text-on-surface" style="font-size: 7px; font-weight: 800;">CRIT</span>
          </div>
          <div class="d-flex align-items-center gap-1">
            <span class="p-1 rounded-circle bg-severity-high" style="box-shadow: 0 0 5px var(--severity-high)"></span>
            <span class="text-xs-caps text-on-surface" style="font-size: 7px; font-weight: 800;">HIGH</span>
          </div>
          <div class="d-flex align-items-center gap-1">
            <span class="p-1 rounded-circle bg-severity-low" style="box-shadow: 0 0 5px var(--severity-low)"></span>
            <span class="text-xs-caps text-on-surface" style="font-size: 7px; font-weight: 800;">LOW</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-wrapper { position: relative; width: 100%; border-radius: 8px; background: var(--surface-container-low); }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    #global-map { background: var(--background) !important; }

    .btn-tactical-map {
      width: 32px;
      height: 32px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--on-surface-variant);
      transition: all 0.2s ease;
    }

    .btn-tactical-map:hover {
      background: var(--surface-container-highest);
      color: var(--primary);
    }

    .btn-tactical-map.active {
      background: var(--primary-container);
      color: var(--primary);
      border-color: color-mix(in srgb, var(--primary) 20%, transparent);
    }

    .btn-tactical-map:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tactical-tooltip-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .tactical-tooltip {
      position: absolute;
      left: 100%;
      margin-left: 12px;
      padding: 4px 8px;
      background: var(--surface-container-highest);
      color: var(--primary);
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.1em;
      border-radius: 4px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s ease;
      border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 2000;
    }

    .tactical-tooltip::before {
      content: '';
      position: absolute;
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-right-color: color-mix(in srgb, var(--primary) 30%, transparent);
    }

    .tactical-tooltip-wrapper:hover .tactical-tooltip {
      opacity: 1;
      transform: translateX(4px);
    }

    ::ng-deep .bl-popup .leaflet-popup-content-wrapper {
      background: var(--surface-container-high) !important;
      color: var(--on-surface) !important;
      border: 1px solid var(--outline-variant) !important;
      border-radius: 8px !important;
      padding: 0 !important;
    }
    ::ng-deep .bl-popup .leaflet-popup-tip { background: var(--surface-container-high) !important; }
    ::ng-deep .bl-popup .leaflet-popup-content { margin: 10px !important; }
  `]
})
export class BreachMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() height = '100%';

  private breachService = inject(BreachService);
  private themeService = inject(ThemeService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private map: any;
  private geoJsonLayer: any;
  private tileLayer: any;

  geoLoading = false;
  geoError = '';
  viewportSync = false;

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

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false, // Disable default Leaflet zoom controls
      attributionControl: false // Disable Leaflet logo and attribution
    }).setView([20, 0], 2);

    this.map.on('moveend', () => {
      if (this.viewportSync) this.loadByViewport();
    });

    this.updateTileLayer();
    this.loadGeoJson();
  }

  zoomIn() {
    if (this.map) this.map.zoomIn();
  }

  zoomOut() {
    if (this.map) this.map.zoomOut();
  }

  toggleViewportSync() {
    this.viewportSync = !this.viewportSync;
    if (this.viewportSync) {
      this.notifications.show('VIEWPORT AUTO-SYNC ENABLED', 'info');
      this.loadByViewport();
    } else {
      this.notifications.show('VIEWPORT AUTO-SYNC DISABLED', 'info');
      this.loadGeoJson(); // Reset to global
    }
  }

  loadByViewport() {
    if (!this.map) return;
    this.geoLoading = true;
    const bounds = this.map.getBounds();

    // Normalize coordinates to stay within valid geographic ranges (-180 to 180, -90 to 90)
    const minLng = Math.max(-180, bounds.getWest());
    const minLat = Math.max(-90, bounds.getSouth());
    const maxLng = Math.min(180, bounds.getEast());
    const maxLat = Math.min(90, bounds.getNorth());

    this.breachService.getWithinBounds(minLng, minLat, maxLng, maxLat).subscribe({
      next: (res) => {
        this.renderMarkers(res.data);
        this.geoLoading = false;
      },
      error: () => {
        this.geoLoading = false;
        this.notifications.show('Viewport sync failed.', 'error');
      }
    });
  }

  private async updateTileLayer() {
    const L = await import('leaflet' as any);
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);

    const isDark = this.themeService.theme() === 'dark';
    const url = isDark
      ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
      : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';

    this.tileLayer = L.tileLayer(url, {
      maxZoom: 20
    }).addTo(this.map);
  }

  refreshMap() {
    if (this.viewportSync) {
      this.loadByViewport();
    } else {
      this.loadGeoJson();
    }
    this.notifications.show('MAP DATA SYNCHRONIZED', 'success', 1500);
  }

  loadGeoJson(severity?: string) {
    this.geoLoading = true;
    this.breachService.getGeoJson(severity).subscribe({
      next: (res) => {
        this.renderMarkers(res.data);
        this.geoLoading = false;
      },
      error: (err) => {
        this.geoLoading = false;
        this.notifications.show('Failed to load map data.', 'error');
      }
    });
  }

  useMyLocation() {
    if (!navigator.geolocation) {
      this.notifications.show('Geolocation not supported.', 'warning');
      return;
    }
    this.geoLoading = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        this.map.setView([latitude, longitude], 10);
        this.breachService.getNear(longitude, latitude).subscribe({
          next: (res) => {
            this.renderMarkers(res.data);
            this.geoLoading = false;
          },
          error: () => {
            this.geoLoading = false;
            this.notifications.show('Failed to load local breaches.', 'error');
          }
        });
      },
      () => {
        this.geoLoading = false;
        this.notifications.show('Location access denied.', 'warning');
      }
    );
  }

  private async renderMarkers(apiResponse: any) {
    const L = await import('leaflet' as any);
    if (this.geoJsonLayer) this.map.removeLayer(this.geoJsonLayer);

    const geoData = apiResponse?.data || apiResponse;
    if (!geoData || !geoData.features) {
       console.warn('Map data empty or invalid format:', apiResponse);
       return;
    }

    const cs = getComputedStyle(document.documentElement);
    const colorMap: any = {
      critical: cs.getPropertyValue('--severity-critical').trim(),
      high: cs.getPropertyValue('--severity-high').trim(),
      medium: cs.getPropertyValue('--severity-medium').trim(),
      low: cs.getPropertyValue('--severity-low').trim(),
      informational: cs.getPropertyValue('--severity-info').trim()
    };

    this.geoJsonLayer = L.geoJSON(geoData, {
      pointToLayer: (feature: any, latlng: any) => {
        const sev = feature.properties.severity?.toLowerCase() || 'medium';
        return L.circleMarker(latlng, {
          radius: Math.max(6, Math.min(12, (feature.properties.risk_score || 5) * 1.2)),
          fillColor: colorMap[sev],
          color: '#fff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      onEachFeature: (feature: any, layer: any) => {
        const props = feature.properties;
        const sev = props.severity?.toLowerCase() || 'medium';
        const sevColor = colorMap[sev] || 'var(--on-surface)';

        layer.bindPopup(`
          <div class="text-on-surface">
            <div class="text-xs-caps fw-bold mb-2" style="font-size: 10px; border-bottom: 1px solid var(--outline-variant); padding-bottom: 4px;">${props.title}</div>
            <div class="small mb-3 d-flex align-items-center gap-2">
              <span class="badge py-1 px-2 text-xs-caps fw-bold shadow-sm"
                    style="font-size: 7px; background: color-mix(in srgb, ${sevColor} 15%, transparent); border: 1px solid ${sevColor}; color: ${sevColor}">
                ${props.severity?.toUpperCase()}
              </span>
            </div>
            <button class="btn btn-primary w-100 py-0 text-xs-caps fw-bold d-flex align-items-center justify-content-center" style="font-size: 8px; height: 28px;" id="popup-btn-${props.id}">VIEW DETAILS</button>
          </div>
        `, {
          className: 'bl-popup',
          closeButton: false,
          minWidth: 160
        });

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
