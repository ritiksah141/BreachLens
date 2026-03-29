import { Component, OnInit, AfterViewInit, OnDestroy, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BreachService } from '../../../core/services/breach.service';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';

@Component({
  selector: 'app-breach-map',
  standalone: true,
  imports: [CommonModule, SeverityBadgeComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="text-light mb-0">Global Breach Map</h3>
      <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-sm btn-danger" (click)="useMyLocation()" [disabled]="geoLoading">
          @if (geoLoading) { <span class="spinner-border spinner-border-sm me-1"></span> }
          📍 Near Me
        </button>
        <select #sevSelect class="form-select form-select-sm bg-dark text-light border-secondary" (change)="filterBySeverity(sevSelect.value)">
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button class="btn btn-sm btn-outline-danger" (click)="loadGeoJson()">Refresh</button>
      </div>
    </div>

    @if (geoError) {
      <div class="alert alert-warning py-1 small mb-2 animate__animated animate__shakeX">
        {{ geoError }}
      </div>
    }

    <div class="card bg-dark border-secondary overflow-hidden shadow-lg" style="height: calc(100vh - 200px);">
      <div #mapContainer id="global-map" style="height: 100%; width: 100%;"></div>
    </div>

    <div class="mt-2 text-muted small">
      <span class="me-3"><span style="color:#dc3545">●</span> Critical</span>
      <span class="me-3"><span style="color:#fd7e14">●</span> High</span>
      <span class="me-3"><span style="color:#ffc107">●</span> Medium</span>
      <span><span style="color:#198754">●</span> Low</span>
    </div>
  `,
  styles: [`
    #global-map { background: #1a1a1a !important; }
  `]
})
export class BreachMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private breachService = inject(BreachService);
  private router = inject(Router);
  private map: any;
  private geoJsonLayer: any;

  geoLoading = false;
  geoError = '';

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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);

    this.loadGeoJson();
  }

  loadGeoJson(severity?: string) {
    this.breachService.getGeoJson(severity).subscribe(res => {
      this.renderMarkers(res.data);
    });
  }

  filterBySeverity(severity: string) {
    this.loadGeoJson(severity);
  }

  useMyLocation() {
    if (!navigator.geolocation) {
      this.geoError = 'Geolocation not supported.';
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
          },
          error: () => {
            this.geoError = 'Failed to load local breaches.';
            this.geoLoading = false;
          }
        });
      },
      (err) => {
        this.geoError = 'Location access denied or unavailable.';
        this.geoLoading = false;
      }
    );
  }

  private async renderMarkers(geoData: any) {
    const L = await import('leaflet' as any);
    if (this.geoJsonLayer) this.map.removeLayer(this.geoJsonLayer);

    const colorMap: any = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#198754',
      informational: '#6c757d'
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
          <div class="dark-popup text-light">
            <strong class="d-block mb-1">${props.title}</strong>
            <div class="small mb-2">
              <span class="badge bg-secondary me-1">${props.severity?.toUpperCase()}</span>
              <span class="text-muted">${props.industry}</span>
            </div>
            <button class="btn btn-xs btn-danger w-100" id="popup-btn-${props.id}">View Details</button>
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
