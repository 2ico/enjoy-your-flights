import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import "../styles.css";
import "./layover-map.css";
import { propSchema, type LayoverMapProps, type CityInfo, type LayoverOption } from "./types";
import { Sidebar } from "./components/Sidebar";

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive globe map showing layover city options with flight details sidebar",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Searching for layover options...",
    invoked: "Layover options loaded",
    csp: {
      resourceDomains: [
        "https://api.mapbox.com",
        "https://events.mapbox.com",
        "https://*.tiles.mapbox.com",
      ],
    },
  },
};

const LayoverMap: React.FC = () => {
  const { props, isPending } = useWidget<LayoverMapProps>();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Group options by city
  const optionsByCity = useCallback(
    (cityCode: string): LayoverOption[] => {
      if (!props?.options) return [];
      return props.options.filter((o) => o.cityCode === cityCode);
    },
    [props?.options]
  );

  // Get duration labels for a city
  const getDurationLabels = useCallback(
    (cityCode: string): string => {
      return optionsByCity(cityCode)
        .map((o) => o.stayLabel)
        .join(", ");
    },
    [optionsByCity]
  );

  // Initialize Mapbox map
  useEffect(() => {
    if (isPending || !props?.mapboxToken || !mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      // @ts-ignore - CSS import handled by bundler
      await import("mapbox-gl/dist/mapbox-gl.css");

      mapboxgl.accessToken = props.mapboxToken;

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        projection: "globe",
        center: [
          (props.origin.coordinates[0] + props.destination.coordinates[0]) / 2,
          (props.origin.coordinates[1] + props.destination.coordinates[1]) / 2,
        ],
        zoom: 2.5,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        // Add atmosphere/fog for globe effect
        map.setFog({
          color: "rgb(20, 20, 30)",
          "high-color": "rgb(40, 40, 60)",
          "horizon-blend": 0.08,
          "space-color": "rgb(10, 10, 20)",
          "star-intensity": 0.6,
        });

        // Add origin marker
        createCityMarker(mapboxgl, map, props.origin, "origin");
        // Add destination marker
        createCityMarker(mapboxgl, map, props.destination, "destination");

        // Add layover city markers
        for (const city of props.layoverCities || []) {
          const labels = getDurationLabels(city.code);
          const cheapest = optionsByCity(city.code).reduce(
            (min, o) => (o.totalEstimatedPrice < min ? o.totalEstimatedPrice : min),
            Infinity
          );
          createLayoverMarker(mapboxgl, map, city, labels, cheapest, (code) =>
            setSelectedCity(code)
          );
        }

        // Draw arc lines
        addArcLines(map, props.origin, props.destination, props.layoverCities);
        setMapLoaded(true);
      });

      mapRef.current = map;
    };

    initMap();

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isPending, props?.mapboxToken]);

  // Fly to selected city
  useEffect(() => {
    if (!mapRef.current || !selectedCity || !mapLoaded) return;
    const city = props?.layoverCities?.find((c) => c.code === selectedCity);
    if (city) {
      mapRef.current.flyTo({
        center: city.coordinates,
        zoom: 4,
        duration: 1500,
        essential: true,
      });
    }
  }, [selectedCity, mapLoaded]);

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="eyf-container">
          <div className="eyf-loading">
            <div className="eyf-loading-spinner" />
            <p>Searching for layover options...</p>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  if (!props) return null;

  const selectedCityOptions = selectedCity ? optionsByCity(selectedCity) : [];
  const selectedCityInfo = selectedCity
    ? props.layoverCities.find((c) => c.code === selectedCity) ?? null
    : null;

  return (
    <McpUseProvider>
      <div className="eyf-container">
        {/* Map */}
        <div ref={mapContainer} className="eyf-map" />

        {/* Sidebar */}
        <Sidebar
          origin={props.origin}
          destination={props.destination}
          departureDate={props.departureDate}
          layoverCities={props.layoverCities}
          selectedCity={selectedCityInfo}
          selectedCityOptions={selectedCityOptions}
          allOptions={props.options}
          onSelectCity={setSelectedCity}
          onBack={() => {
            setSelectedCity(null);
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: [
                  (props.origin.coordinates[0] + props.destination.coordinates[0]) / 2,
                  (props.origin.coordinates[1] + props.destination.coordinates[1]) / 2,
                ],
                zoom: 2.5,
                duration: 1200,
              });
            }
          }}
          getDurationLabels={getDurationLabels}
          getOptionsByCity={optionsByCity}
        />
      </div>
    </McpUseProvider>
  );
};

// ── Map Helpers ──────────────────────────────────────────────────────

function createCityMarker(mapboxgl: any, map: any, city: CityInfo, type: "origin" | "destination") {
  const el = document.createElement("div");
  el.className = `eyf-marker eyf-marker-${type}`;
  el.innerHTML = `<span class="eyf-marker-label">${city.name}</span>`;

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat(city.coordinates)
    .addTo(map);

  return marker;
}

function createLayoverMarker(
  mapboxgl: any,
  map: any,
  city: CityInfo,
  labels: string,
  cheapestPrice: number,
  onClick: (code: string) => void
) {
  const el = document.createElement("div");
  el.className = "eyf-marker eyf-marker-layover";
  el.innerHTML = `
    <div class="eyf-marker-bubble">
      <span class="eyf-marker-city">${city.name}</span>
      <span class="eyf-marker-durations">${labels}</span>
      <span class="eyf-marker-price">from $${cheapestPrice}</span>
    </div>
  `;
  el.addEventListener("click", () => onClick(city.code));

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat(city.coordinates)
    .addTo(map);

  return marker;
}

function generateArc(
  start: number[],
  end: number[],
  numPoints: number = 50
): number[][] {
  const points: number[][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    // Add altitude curve
    const alt = Math.sin(t * Math.PI) * 0.15 * Math.abs(end[0] - start[0]);
    points.push([lng, lat + alt]);
  }
  return points;
}

function addArcLines(map: any, origin: CityInfo, dest: CityInfo, layoverCities: CityInfo[]) {
  const features: any[] = [];

  for (const city of layoverCities) {
    // Arc from origin to layover
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: generateArc(origin.coordinates, city.coordinates),
      },
      properties: { type: "leg-a" },
    });
    // Arc from layover to destination
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: generateArc(city.coordinates, dest.coordinates),
      },
      properties: { type: "leg-b" },
    });
  }

  map.addSource("flight-arcs", {
    type: "geojson",
    data: { type: "FeatureCollection", features },
  });

  map.addLayer({
    id: "flight-arcs-line",
    type: "line",
    source: "flight-arcs",
    paint: {
      "line-color": ["match", ["get", "type"], "leg-a", "#60a5fa", "leg-b", "#34d399", "#60a5fa"],
      "line-width": 2,
      "line-opacity": 0.7,
      "line-dasharray": [2, 2],
    },
  });
}

export default LayoverMap;
