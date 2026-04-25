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

      <!-- Map Controls Overlay -->
      <div class="position-absolute top-0 end-0 m-2 z-3 d-flex flex-column gap-2" style="z-index: 1001 !important;">
        <button class="btn btn-dark bg-surface-container-highest border-0 p-1 shadow-sm rounded-circle"
                (click)="useMyLocation()" [disabled]="geoLoading" title="Near Me">
          <span class="material-symbols-outlined fs-6" *ngIf="!geoLoading">my_location</span>
          <span class="spinner-border spinner-border-sm" *ngIf="geoLoading"></span>
        </button>
        <button class="btn btn-dark bg-surface-container-highest border-0 p-1 shadow-sm rounded-circle"
                (click)="loadGeoJson()" title="Refresh">
          <span class="material-symbols-outlined fs-6">refresh</span>
        </button>
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
      zoomControl: false // Disable default to reposition it
    }).setView([20, 0], 2);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.updateTileLayer();
    this.loadGeoJson();
  }

  private async updateTileLayer() {
    const L = await import('leaflet' as any);
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);

    const isDark = this.themeService.theme() === 'dark';
    const url = isDark
      ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
      : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';

    this.tileLayer = L.tileLayer(url, {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>',
      maxZoom: 20
    }).addTo(this.map);
  }

  loadGeoJson(severity?: string) {
    this.breachService.getGeoJson(severity).subscribe({
      next: (res) => {
        this.renderMarkers(res.data);
      },
      error: (err) => {
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

  private async renderMarkers(geoData: any) {
    const L = await import('leaflet' as any);
    if (this.geoJsonLayer) this.map.removeLayer(this.geoJsonLayer);

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
        layer.bindPopup(`
          <div class="text-on-surface">
          <div class="text-xs-caps fw-bold mb-1" style="font-size: 10px;">${props.title}</div>
          <div class="small mb-2 d-flex align-items-center gap-2">
            <span class="badge py-1 px-2 border border-outline-variant border-opacity-25 text-xs-caps" style="font-size: 7px; background: var(--surface-container-low); color: var(--on-surface)">${props.severity?.toUpperCase()}</span>
          </div>
          <button class="btn btn-primary w-100 py-1 text-xs-caps" style="font-size: 8px;" id="popup-btn-${props.id}">DETAILS</button>
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
