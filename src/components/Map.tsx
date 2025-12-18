import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    type: 'driver' | 'passenger' | 'origin' | 'destination' | 'pickup';
    popup?: string;
  }>;
  route?: Array<[number, number]>;
  onMapClick?: (lng: number, lat: number) => void;
  className?: string;
  interactive?: boolean;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

const Map: React.FC<MapProps> = ({
  center = [19.699, 48.669],
  zoom = 7,
  markers = [],
  route,
  onMapClick,
  className = '',
  interactive = true
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.remove());
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: zoom,
      interactive: interactive,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [interactive]);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    markers.forEach(markerData => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      
      const colors = {
        driver: '#20b4a8',
        passenger: '#ef6c4c',
        origin: '#20b4a8',
        destination: '#ef6c4c',
        pickup: '#f59e0b'
      };

      const icons = {
        driver: '🚗',
        passenger: '👤',
        origin: '📍',
        destination: '🎯',
        pickup: '🏁'
      };

      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: ${colors[markerData.type]};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border: 3px solid white;
          cursor: pointer;
          transition: transform 0.2s;
        ">${icons[markerData.type]}</div>
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map.current!);

      if (markerData.popup) {
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<div class="font-sans p-2">${markerData.popup}</div>`);
        marker.setPopup(popup);
      }

      markersRef.current.push(marker);
    });
  }, [markers]);

  useEffect(() => {
    if (!map.current || !route || route.length < 2) return;

    const sourceId = 'route';
    const layerId = 'route-line';

    map.current.on('load', () => {
      if (map.current?.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route
          }
        });
      } else {
        map.current?.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route
            }
          }
        });

        map.current?.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#20b4a8',
            'line-width': 5,
            'line-opacity': 0.8
          }
        });
      }

      const bounds = route.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(route[0], route[0])
      );
      map.current?.fitBounds(bounds, { padding: 50 });
    });
  }, [route]);

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default Map;
