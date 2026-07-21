import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    type: 'driver' | 'passenger' | 'origin' | 'destination' | 'pickup' | 'stop' | 'dropoff' | 'live-driver' | 'gas_station';
    popup?: string;
    avatarUrl?: string | null;
    label?: string;
  }>;
  waypoints?: Array<{ lat: number; lng: number }>; // Intermediate stops for route
  route?: Array<[number, number]>;
  plannedRoute?: Array<[number, number]>;
  showRoute?: boolean; // Auto-fetch route between origin and destination markers
  onMapClick?: (lng: number, lat: number) => void;
  onMarkerClick?: (id: string) => void;
  onRouteCalculated?: (routePolyline: string) => void; // Callback with encoded polyline
  className?: string;
  interactive?: boolean;
  preferStatic?: boolean;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

const DEFAULT_CENTER: [number, number] = [19.699, 48.669];
const MARKER_COLORS: Record<string, string> = {
  driver: '#2563eb',
  passenger: '#ef6c4c',
  origin: '#2563eb',
  destination: '#ef4444',
  pickup: '#22c55e',
  stop: '#8b5cf6',
  dropoff: '#ef4444',
  gas_station: '#f59e0b'
};
const ROUTE_COLOR = '#2563eb';
const ROUTE_CASING_COLOR = '#ffffff';
const ROUTE_GLOW_COLOR = '#60a5fa';

const Map: React.FC<MapProps> = ({
  center = DEFAULT_CENTER,
  zoom = 7,
  markers = [],
  waypoints = [],
  route: providedRoute,
  plannedRoute,
  showRoute = false,
  onMapClick,
  onMarkerClick,
  onRouteCalculated,
  className = '',
  interactive = true,
  preferStatic = false
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [fetchedRoute, setFetchedRoute] = useState<Array<[number, number]> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const hasFittedRef = useRef(false);
  const userInteractedRef = useRef(false);

  const normalizedCenter = React.useMemo<[number, number]>(() => (
    Number.isFinite(center[0]) && Number.isFinite(center[1]) ? center : DEFAULT_CENTER
  ), [center]);

  const safeMarkers = React.useMemo(
    () => markers.filter(marker => Number.isFinite(marker.lat) && Number.isFinite(marker.lng)),
    [markers]
  );

  const staticMapUrl = React.useMemo(() => {
    // Exclude gas stations from static preview — they're context, not focus,
    // and a single station would otherwise cause auto-zoom onto it.
    const focusMarkers = safeMarkers.filter(m => m.type !== 'gas_station');
    const overlay = focusMarkers.slice(0, 12).map(marker => {
      const color = (MARKER_COLORS[marker.type] || MARKER_COLORS.origin).replace('#', '');
      return `pin-s+${color}(${marker.lng},${marker.lat})`;
    }).join(',');
    const viewport = overlay ? 'auto' : `${normalizedCenter[0]},${normalizedCenter[1]},${Math.min(Math.max(zoom, 1), 16)},0,0`;
    const overlayPath = overlay ? `${overlay}/` : '';
    const padding = overlay ? 'padding=64&' : '';
    return `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/static/${overlayPath}${viewport}/800x450@2x?${padding}access_token=${MAPBOX_TOKEN}`;
  }, [normalizedCenter, safeMarkers, zoom]);

  // Find origin and destination from markers for route fetching
  const originMarker = safeMarkers.find(m => m.type === 'origin');
  const destinationMarker = safeMarkers.find(m => m.type === 'destination');

  // Fetch route from Mapbox Directions API with waypoints
  useEffect(() => {
    if (!showRoute || !originMarker || !destinationMarker) {
      setFetchedRoute(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        // Build coordinates string: origin;waypoint1;waypoint2;...;destination
        const coords = [
          `${originMarker.lng},${originMarker.lat}`,
          ...waypoints.map(wp => `${wp.lng},${wp.lat}`),
          `${destinationMarker.lng},${destinationMarker.lat}`
        ].join(';');

        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();
        
        if (data.routes && data.routes[0]) {
          setFetchedRoute(data.routes[0].geometry.coordinates);
          
          // If callback provided, send the polyline (we'll encode it)
          if (onRouteCalculated && data.routes[0].geometry) {
            // Store as JSON string for database
            onRouteCalculated(JSON.stringify(data.routes[0].geometry.coordinates));
          }
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    fetchRoute();
  }, [showRoute, originMarker?.lat, originMarker?.lng, destinationMarker?.lat, destinationMarker?.lng, waypoints, onRouteCalculated]);

  const route = providedRoute || fetchedRoute;

  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.remove());
    };
  }, []);

  // Store initial center to prevent map recreation on every center change
  const initialCenterRef = useRef<[number, number]>(normalizedCenter);

  useEffect(() => {
    if (!mapContainer.current || preferStatic) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    setMapReady(false);
    setMapUnavailable(false);

    const instance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: initialCenterRef.current,
      zoom: zoom,
      interactive: interactive,
    });
    map.current = instance;

    instance.on('load', () => {
      setMapReady(true);
      instance.resize();
    });
    instance.on('error', (event) => {
      console.warn('Mapbox map error:', event.error || event);
      setMapUnavailable(true);
    });
    // Mark map as user-interacted so we stop auto-fitting on live route refresh
    const markInteracted = () => { userInteractedRef.current = true; };
    instance.on('dragstart', markInteracted);
    instance.on('zoomstart', (e: any) => { if (e.originalEvent) markInteracted(); });

    instance.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    if ('geolocation' in navigator) {
      instance.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true
        }),
        'top-right'
      );
    }

    if (onMapClick) {
      instance.on('click', (e) => {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      });
    }

    // Force resize once the map element is properly laid out — fixes blank map
    // when the container is mounted inside an animated/conditionally-shown parent.
    const resizeMap = () => map.current?.resize();
    const t1 = setTimeout(resizeMap, 100);
    const t2 = setTimeout(resizeMap, 500);
    const fallbackTimer = setTimeout(() => {
      if (!instance.loaded()) setMapUnavailable(true);
    }, 7000);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainer.current) {
      ro = new ResizeObserver(() => resizeMap());
      ro.observe(mapContainer.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(fallbackTimer);
      ro?.disconnect();
      instance.remove();
      if (map.current === instance) map.current = null;
    };
  }, [interactive, preferStatic]);

  // Update center smoothly without recreating the map
  useEffect(() => {
    if (map.current && normalizedCenter) {
      // Only fly to if map is loaded and center is significantly different
      const currentCenter = map.current.getCenter();
      const distance = Math.sqrt(
        Math.pow(currentCenter.lng - normalizedCenter[0], 2) + 
        Math.pow(currentCenter.lat - normalizedCenter[1], 2)
      );
      
      // Only move if distance is significant (avoid micro-movements)
      if (distance > 0.0001) {
        map.current.easeTo({
          center: normalizedCenter,
          duration: 500
        });
      }
    }
  }, [normalizedCenter]);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    safeMarkers.forEach(markerData => {
      const el = document.createElement('div');
      el.className = 'custom-marker';

      if (markerData.type === 'live-driver') {
        // Rich avatar marker for live drivers
        const wrap = document.createElement('div');
        wrap.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.25));
        `;

        const avatarRing = document.createElement('div');
        avatarRing.style.cssText = `
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #20b4a8, #16a085);
          padding: 3px;
          position: relative;
        `;

        // Pulsing ring around the avatar — signals "live"
        const pulse = document.createElement('div');
        pulse.style.cssText = `
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: rgba(32, 180, 168, 0.35);
          animation: lovable-live-driver-pulse 1.8s ease-out infinite;
          pointer-events: none;
        `;
        avatarRing.appendChild(pulse);

        if (!document.getElementById('lovable-live-driver-pulse-style')) {
          const style = document.createElement('style');
          style.id = 'lovable-live-driver-pulse-style';
          style.textContent = `@keyframes lovable-live-driver-pulse {
            0% { transform: scale(0.85); opacity: 0.8; }
            70% { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(1.6); opacity: 0; }
          }`;
          document.head.appendChild(style);
        }

        const avatar = document.createElement('div');
        avatar.style.cssText = `
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #fff center/cover no-repeat;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #20b4a8;
          font-weight: 700;
          overflow: hidden;
          border: 2px solid #fff;
        `;
        if (markerData.avatarUrl) {
          const img = document.createElement('img');
          img.src = markerData.avatarUrl;
          img.alt = markerData.label || 'Vodič';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
          avatar.appendChild(img);
        } else {
          avatar.textContent = (markerData.label || 'V').charAt(0).toUpperCase();
        }
        avatarRing.appendChild(avatar);

        wrap.appendChild(avatarRing);

        if (markerData.label) {
          const tag = document.createElement('div');
          tag.style.cssText = `
            margin-top: 4px;
            background: #fff;
            color: #0f172a;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 999px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            max-width: 140px;
            overflow: hidden;
            text-overflow: ellipsis;
          `;
          tag.textContent = markerData.label;
          wrap.appendChild(tag);
        }

        el.appendChild(wrap);
        el.addEventListener('mouseenter', () => { wrap.style.transform = 'scale(1.08)'; });
        el.addEventListener('mouseleave', () => { wrap.style.transform = 'scale(1)'; });
        if (onMarkerClick) {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onMarkerClick(markerData.id);
          });
        }
      } else if (markerData.type === 'gas_station') {
        // Circular logo marker for partner gas stations
        const markerDiv = document.createElement('div');
        const size = 36;
        markerDiv.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          border: 2px solid ${MARKER_COLORS.gas_station};
          cursor: pointer;
          transition: transform 0.2s;
          overflow: hidden;
        `;
        const initial = (markerData.label || 'S').charAt(0).toUpperCase();
        if (markerData.avatarUrl) {
          const img = document.createElement('img');
          img.src = markerData.avatarUrl;
          img.alt = markerData.label || 'Stanica';
          img.referrerPolicy = 'no-referrer';
          img.crossOrigin = 'anonymous';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
          img.onerror = () => {
            if (img.parentNode) markerDiv.removeChild(img);
            markerDiv.style.color = MARKER_COLORS.gas_station;
            markerDiv.style.fontWeight = '700';
            markerDiv.textContent = initial;
          };
          markerDiv.appendChild(img);
        } else {
          markerDiv.style.color = MARKER_COLORS.gas_station;
          markerDiv.style.fontWeight = '700';
          markerDiv.textContent = initial;
        }
        el.appendChild(markerDiv);
        el.addEventListener('mouseenter', () => { markerDiv.style.transform = 'scale(1.15)'; });
        el.addEventListener('mouseleave', () => { markerDiv.style.transform = 'scale(1)'; });
      } else {
        const icons: Record<string, string> = {
          driver: '🚗',
          passenger: '👤',
          origin: '📍',
          destination: '🎯',
          pickup: '🟢',
          stop: '🔵',
          dropoff: '🔴',
        };

        // Use DOM API instead of innerHTML to prevent XSS
        const markerDiv = document.createElement('div');
        markerDiv.style.cssText = `
          width: 40px;
          height: 40px;
          background: ${MARKER_COLORS[markerData.type] || '#888'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border: 3px solid white;
          cursor: pointer;
          transition: transform 0.2s;
        `;
        markerDiv.textContent = icons[markerData.type] || '📍';
        el.appendChild(markerDiv);

        el.addEventListener('mouseenter', () => {
          markerDiv.style.transform = 'scale(1.1)';
        });
        el.addEventListener('mouseleave', () => {
          markerDiv.style.transform = 'scale(1)';
        });
        if (onMarkerClick) {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onMarkerClick(markerData.id);
          });
        }
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map.current!);

      if (markerData.popup) {
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: true })
          .setText(markerData.popup);
        // Preserve newlines in popup content (e.g. station name + address)
        popup.on('open', () => {
          const content = popup.getElement()?.querySelector('.mapboxgl-popup-content') as HTMLElement | null;
          if (content) {
            content.style.whiteSpace = 'pre-line';
            content.style.maxWidth = '240px';
            content.style.fontSize = '13px';
            content.style.lineHeight = '1.4';
          }
        });
        marker.setPopup(popup);

        if (markerData.type === 'gas_station') {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            popup.setLngLat([markerData.lng, markerData.lat]).addTo(map.current!);
          });
        }
      }

      markersRef.current.push(marker);
    });
  }, [safeMarkers, onMarkerClick]);

  // Draw planned (pre-trip) route — dashed amber underlay so passengers
  // always see the driver's chosen path, even after pickup.
  useEffect(() => {
    if (!map.current || !plannedRoute || plannedRoute.length < 2) return;

    const sourceId = 'planned-route';
    const layerId = 'planned-route-line';
    const casingId = 'planned-route-casing';

    const addPlanned = () => {
      if (!map.current) return;
      [layerId, casingId].forEach(id => {
        if (map.current!.getLayer(id)) map.current!.removeLayer(id);
      });
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: plannedRoute }
        }
      });

      map.current.addLayer({
        id: casingId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.85 }
      });

      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 4,
          'line-opacity': 0.9,
          'line-dasharray': [2, 1.5]
        }
      });

      // If no live route, fit bounds to the planned route + markers (once)
      if (!providedRoute && !fetchedRoute && !hasFittedRef.current && !userInteractedRef.current) {
        const bounds = plannedRoute.reduce(
          (b, coord) => b.extend(coord as [number, number]),
          new mapboxgl.LngLatBounds(plannedRoute[0], plannedRoute[0])
        );
        safeMarkers.filter(m => m.type !== 'gas_station').forEach(m => bounds.extend([m.lng, m.lat]));
        map.current.fitBounds(bounds, { padding: 60 });
        hasFittedRef.current = true;
      }
    };

    if (map.current.isStyleLoaded()) addPlanned();
    else map.current.on('load', addPlanned);
  }, [plannedRoute]);

  // Draw route on map
  useEffect(() => {
    if (!map.current || !route || route.length < 2) return;

    const sourceId = 'route';
    const glowId = 'route-glow';
    const casingId = 'route-casing';
    const layerId = 'route-line';

    const addRoute = () => {
      if (!map.current) return;

      // Remove existing route layers if any (in correct order)
      [layerId, casingId, glowId].forEach(id => {
        if (map.current!.getLayer(id)) map.current!.removeLayer(id);
      });
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }

      map.current.addSource(sourceId, {
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

      // Soft outer glow
      map.current.addLayer({
        id: glowId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ROUTE_GLOW_COLOR,
          'line-width': 14,
          'line-opacity': 0.25,
          'line-blur': 6
        }
      });

      // White casing for crisp contrast
      map.current.addLayer({
        id: casingId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ROUTE_CASING_COLOR,
          'line-width': 9,
          'line-opacity': 0.95
        }
      });

      // Main brand-blue route line
      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ROUTE_COLOR,
          'line-width': 5.5,
          'line-opacity': 1
        }
      });

      // Fit bounds once so live route refreshes don't yank the viewport.
      // Include planned route so users keep the full trip in view.
      if (!hasFittedRef.current && !userInteractedRef.current) {
        const bounds = route.reduce(
          (bounds, coord) => bounds.extend(coord as [number, number]),
          new mapboxgl.LngLatBounds(route[0], route[0])
        );
        if (plannedRoute && plannedRoute.length > 1) {
          plannedRoute.forEach(coord => bounds.extend(coord as [number, number]));
        }
        safeMarkers.filter(m => m.type !== 'gas_station').forEach(m => {
          bounds.extend([m.lng, m.lat]);
        });
        map.current.fitBounds(bounds, { padding: 60 });
        hasFittedRef.current = true;
      }
    };

    if (map.current.isStyleLoaded()) {
      addRoute();
    } else {
      map.current.on('load', addRoute);
    }
  }, [route]);

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-muted ${className}`}>
      <img
        src={staticMapUrl}
        alt="Mapa jázd"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${mapReady && !mapUnavailable && !preferStatic ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
      />
      {!preferStatic && (
        <div
          ref={mapContainer}
          className={`absolute inset-0 transition-opacity duration-300 ${mapReady && !mapUnavailable ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />
      )}
    </div>
  );
};

export default Map;
