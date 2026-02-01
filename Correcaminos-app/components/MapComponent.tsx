
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Location } from '../types';
import { Compass } from 'lucide-react';

interface MapComponentProps {
  origin: Location | null;
  destination: Location | null;
  routeGeometry: any | null;
  onPointSelect: (type: 'origin' | 'destination', loc: Location) => void;
}

const TANDIL_COORDS: [number, number] = [-37.3217, -59.1332];

const MapComponent: React.FC<MapComponentProps> = ({ origin, destination, routeGeometry, onPointSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<{ origin?: L.Marker; destination?: L.Marker; birdIcon?: L.Marker }>({});
  const routeLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false // Quitamos el default para ponerlo personalizado si se requiere o dejarlo limpio
      }).setView(TANDIL_COORDS, 14);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(leafletMap.current);

      L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

      // Control de Brújula personalizado
      const CompassControl = L.Control.extend({
        onAdd: function() {
          const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
          div.style.backgroundColor = 'white';
          div.style.width = '40px';
          div.style.height = '40px';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'center';
          div.style.borderRadius = '8px';
          div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
          div.style.cursor = 'default';
          div.innerHTML = `
            <div style="color: #8b5cf6;">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
              </svg>
            </div>
          `;
          return div;
        }
      });
      new CompassControl({ position: 'topright' }).addTo(leafletMap.current);

      leafletMap.current.on('click', (e: L.LeafletMouseEvent) => {
        if (!origin) {
          onPointSelect('origin', { lat: e.latlng.lat, lng: e.latlng.lng });
        } else {
          onPointSelect('destination', { lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });
    }
  }, [origin, onPointSelect]);

  useEffect(() => {
    if (!leafletMap.current) return;

    if (markersRef.current.origin) leafletMap.current.removeLayer(markersRef.current.origin);
    if (markersRef.current.destination) leafletMap.current.removeLayer(markersRef.current.destination);
    if (markersRef.current.birdIcon) leafletMap.current.removeLayer(markersRef.current.birdIcon);
    if (routeLayerRef.current) leafletMap.current.removeLayer(routeLayerRef.current);

    if (routeGeometry) {
      routeLayerRef.current = L.geoJSON(routeGeometry, {
        style: { color: '#a855f7', weight: 7, opacity: 0.9, lineJoin: 'round' }
      }).addTo(leafletMap.current);

      const coords = routeGeometry.coordinates;
      if (coords.length > 2) {
        const midIdx = Math.floor(coords.length * 2 / 3);
        const midPoint = coords[midIdx];
        markersRef.current.birdIcon = L.marker([midPoint[1], midPoint[0]], {
          zIndexOffset: 3000,
          icon: L.divIcon({
            className: 'animate-bounce',
            html: `
              <div style="background: white; border-radius: 50%; padding: 6px; border: 3px solid #8b5cf6; box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="#8b5cf6" stroke-width="3" fill="none">
                  <path d="M16 7h.01"/><path d="M3.4 18H5a3 3 0 0 0 6 0H19a3 3 0 0 0 6 0h1.1"/>
                  <path d="M13 14h.01"/><path d="M16 14h.01"/><path d="M10 14h.01"/><path d="M10 7h.01"/><path d="M2 14h.01"/>
                </svg>
              </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        }).addTo(leafletMap.current);
      }
    }

    if (origin) {
      markersRef.current.origin = L.marker([origin.lat, origin.lng], {
        zIndexOffset: 2000,
        icon: L.divIcon({
          className: '',
          html: `<div style="background-color: #8b5cf6; width: 42px; height: 42px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);">A</div>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        })
      }).addTo(leafletMap.current);
    }

    if (destination) {
      markersRef.current.destination = L.marker([destination.lat, destination.lng], {
        zIndexOffset: 2000,
        icon: L.divIcon({
          className: '',
          html: `<div style="background-color: #f97316; width: 42px; height: 42px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; color: black; font-weight: 900; font-size: 20px; box-shadow: 0 0 20px rgba(249, 115, 22, 0.6);">B</div>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        })
      }).addTo(leafletMap.current);
    }

    if (routeLayerRef.current) {
      leafletMap.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [100, 100] });
    }
  }, [origin, destination, routeGeometry]);

  return <div ref={mapRef} className="h-full w-full z-0" />;
};

export default MapComponent;
