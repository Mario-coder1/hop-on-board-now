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
    type: 'driver' | 'passenger' | 'origin' | 'destination' | 'pickup' | 'stop' | 'dropoff';
    popup?: string;
  }>;
  waypoints?: Array<{ lat: number; lng: number }>; // Intermediate stops for route
  route?: Array<[number, number]>;
  showRoute?: boolean; // Auto-fetch route between origin and destination markers
  onMapClick?: (lng: number, lat: number) => void;
  onRouteCalculated?: (routePolyline: string) => void; // Callback with encoded polyline
  className?: string;
  interactive?: boolean;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFyaWtveGQiLCJhIjoiY21qYjVkajVyMGRhaTNlc2QzbnpqY3p0eiJ9.P4mbLpcwyogmes1wzFsl8g';

const Map: React.FC<MapProps> = ({
  center = [19.699, 48.669],
  zoom = 7,
  markers = [],
  waypoints = [],
  route: providedRoute,
  showRoute = false,
  onMapClick,
  onRouteCalculated,
  className = '',
  interactive = true
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [fetchedRoute, setFetchedRoute] = useState<Array<[number, number]> | null>(null);

  // Find origin and destination from markers for route fetching
  const originMarker = markers.find(m => m.type === 'origin');
  const destinationMarker = markers.find(m => m.type === 'destination');

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

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
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
      
      const colors: Record<string, string> = {
        driver: '#20b4a8',
        passenger: '#ef6c4c',
        origin: '#20b4a8',
        destination: '#ef6c4c',
        pickup: '#22c55e',
        stop: '#8b5cf6',
        dropoff: '#ef4444'
      };

      const icons: Record<string, string> = {
        driver: '🚗',
        passenger: '👤',
        origin: '📍',
        destination: '🎯',
        pickup: '🟢',
        stop: '🔵',
        dropoff: '🔴'
      };

      // Use DOM API instead of innerHTML to prevent XSS
      const markerDiv = document.createElement('div');
      markerDiv.style.cssText = `
        width: 40px;
        height: 40px;
        background: ${colors[markerData.type] || '#888'};
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
          .setText(markerData.popup); // Use setText to prevent XSS
        marker.setPopup(popup);
      }

      markersRef.current.push(marker);
    });
  }, [markers]);

  // Draw route on map
  useEffect(() => {
    if (!map.current || !route || route.length < 2) return;

    const sourceId = 'route';
    const layerId = 'route-line';

    const addRoute = () => {
      if (!map.current) return;

      // Remove existing route if any
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
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

      map.current.addLayer({
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

      // Fit bounds to show the entire route
      const bounds = route.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(route[0], route[0])
      );
      
      // Include all markers in bounds
      markers.forEach(m => {
        bounds.extend([m.lng, m.lat]);
      });

      map.current.fitBounds(bounds, { padding: 60 });
    };

    if (map.current.isStyleLoaded()) {
      addRoute();
    } else {
      map.current.on('load', addRoute);
    }
  }, [route, markers]);

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default Map;
