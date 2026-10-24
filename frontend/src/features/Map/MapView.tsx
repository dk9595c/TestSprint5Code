import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "./MapView.css";
import { DatedActivity } from "../Itinerary/ItineraryPanel";
import TileManager from "./TileManager";
import axios from "axios";
import type {
  FeatureCollection,
  Feature,
  Polygon,
  LineString,
  GeoJsonProperties,
} from "geojson";
import { weatherDescriptionColors } from "./WeatherColorCode";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const WEATHER_LAYER_ID = "weather-voronoi";
const REDLINING_LAYER_ID = "redlining-layer";

type HighlightMode = "none" | "weather" | "redlining";

type Props = {
  markers: DatedActivity[];
  lat: number;
  lng: number;
  highlightMode: HighlightMode;
};

export default function MapView({ markers, lat, lng, highlightMode }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);

  // Initialize map instance
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom: 12,
    });

    setMapInstance(map);

    return () => {
      map.remove();
    };
  }, []);

  // Render markers
  useEffect(() => {
    if (!mapInstance) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    markers.forEach((markerData) => {
      const marker = new mapboxgl.Marker()
        .setLngLat([markerData.lng, markerData.lat])
        .setPopup(new mapboxgl.Popup().setText(markerData.name ?? ""))
        .addTo(mapInstance);

      markerRefs.current.push(marker);
    });
  }, [markers, mapInstance]);

  // Fetch and render weather polygons
  const fetchAndRenderWeatherPolygons = async (display: boolean = true) => {
    if (!mapInstance) return;

    try {
      const weatherRes = await axios.post(
        "http://localhost:3001/upload-weather-csv"
      );

      if (weatherRes.status !== 200) {
        throw new Error("Failed to fetch weather polygons.");
      }
      if (!display) {
        return;
      }
      const polygons = weatherRes.data;
      const geoJson = convertToGeoJSON(polygons);

      if (!mapInstance.getSource("weather")) {
        mapInstance.addSource("weather", {
          type: "geojson",
          data: geoJson,
        });

        mapInstance.addLayer({
          id: WEATHER_LAYER_ID,
          type: "fill",
          source: "weather",
          paint: {
            "fill-color": [
              "match",
              ["get", "weatherDescription"],
              ...Object.entries(weatherDescriptionColors).flat(),
              "#d1d5db",
            ],
            "fill-opacity": 0.4,
            "fill-outline-color": "#000000",
          },
        });
      } else {
        const source = mapInstance.getSource(
          "weather"
        ) as mapboxgl.GeoJSONSource;
        source.setData(geoJson);
      }
    } catch (err) {
      console.error("Error updating weather overlay:", err);
    }
  };
  const fetchAndRenderRedliningPolygons = async (display: boolean = true) => {
    if (!mapInstance) return;

    try {
      const redliningRes = await axios.post(
        "http://localhost:3001/highlight-redlining"
      );

      if (redliningRes.status !== 200) {
        throw new Error("Failed to fetch redlining polygons.");
      }
      if (!display) {
        return;
      }
      const geoJson: FeatureCollection = redliningRes.data;

      if (!mapInstance.getSource("redlining")) {
        mapInstance.addSource("redlining", {
          type: "geojson",
          data: geoJson,
        });

        mapInstance.addLayer({
          id: REDLINING_LAYER_ID,
          type: "fill",
          source: "redlining",
          paint: {
            "fill-color": [
              "match",
              ["get", "holc_grade"],
              "A",
              "#5bcc04", // Green
              "B",
              "#04b8cc", // Blue
              "C",
              "#e9ed0e", // Yellow
              "D",
              "#d11d1d", // Red
              "H",
              "#000000", // Black
              "#ccc", // Default gray
            ],
            "fill-opacity": 0.2,
          },
        });
      } else {
        const source = mapInstance.getSource(
          "redlining"
        ) as mapboxgl.GeoJSONSource;
        source.setData(geoJson);
      }
    } catch (err) {
      console.error("Error updating redlining overlay:", err);
    }
  };

  useEffect(() => {
    if (!mapInstance) return;

    const removeLayerAndSource = (layerId: string, sourceId: string) => {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
      }
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeSource(sourceId);
      }
    };

    if (highlightMode === "none") {
      removeLayerAndSource(WEATHER_LAYER_ID, "weather");
      removeLayerAndSource(REDLINING_LAYER_ID, "redlining");
      return;
    }

    if (highlightMode === "weather") {
      fetchAndRenderWeatherPolygons();
      removeLayerAndSource(REDLINING_LAYER_ID, "redlining");
    }

    if (highlightMode === "redlining") {
      fetchAndRenderRedliningPolygons();
      removeLayerAndSource(WEATHER_LAYER_ID, "weather");
    }
  }, [highlightMode, mapInstance]);

  // Handle tile updates and trigger weather overlay if needed
  const handleTilesChanged = async (tileKeys: string[]) => {
    console.log("New visible tiles:", tileKeys);

    try {
      const tileRes = await axios.post(
        "http://localhost:3001/update-visible-tiles",
        { tileKeys }
      );

      if (tileRes.status !== 200) {
        throw new Error("Failed to update tiles.");
      }
      //these should be called for search pourposes but their graphs shouldn't be displayed, maybe add a boolean to disable that
      fetchAndRenderWeatherPolygons(false);
      fetchAndRenderRedliningPolygons(false);
    } catch (err) {
      console.error("Error updating tiles or weather overlay:", err);
    }
  };

  return (
    <div ref={mapContainer} className="map-container">
      {mapInstance && (
        <TileManager map={mapInstance} onTilesChanged={handleTilesChanged} />
      )}
    </div>
  );
}

function convertToGeoJSON(
  stations: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    description?: string;
    polygon?: { x: number; y: number }[];
  }[]
): FeatureCollection<Polygon, GeoJsonProperties> {
  const features: Feature<Polygon, GeoJsonProperties>[] = stations
    .filter((s) => s.polygon && s.polygon.length >= 3)
    .map((station) => {
      const coords = station.polygon!.map((p) => [p.x, p.y]);
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push(first); // Ensure closed ring
      }

      return {
        type: "Feature",
        properties: {
          id: station.id,
          name: station.name,
          weatherDescription: station.description ?? "Unknown",
        },
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
      };
    });

  return {
    type: "FeatureCollection",
    features,
  };
}
