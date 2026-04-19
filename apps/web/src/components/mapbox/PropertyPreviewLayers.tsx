import * as React from "react";
import mapboxgl from "mapbox-gl";
import { useMapbox, useMapboxIsMapStyleLoaded } from "./MapboxContext";
import type { Property } from "@/routes/_app/index";

const SOURCE_ID = "properties-source";
const PINS_LAYER_ID = "properties-pins";
const HEATMAP_LAYER_ID = "properties-heatmap";
const SELECTED_LAYER_ID = "properties-selected";

function formatNumberOrDash(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  } catch {
    return String(value);
  }
}

export type PropertyPreviewLayersProps = {
  properties: Property[];
  enablePins?: boolean;
  enableHeatmap?: boolean;
  showLabels?: boolean;
  weightKey?: "lastPrice";
  pinColor?: string;
  selectedPinColor?: string;
  selectedProperty?: Property | null;
  setSelectedProperty?: (property: Property | null) => void;
};

function propertiesToGeoJSON(properties: Property[]) {
  return {
    type: "FeatureCollection" as const,
    features: properties.map((property) => {
      return {
        type: "Feature" as const,
        id: property.id,
        properties: property,
        geometry: {
          type: "Point" as const,
          coordinates: [property.longitude ?? 0, property.latitude ?? 0],
        },
      };
    }),
  } as const;
}

export function PropertyPreviewLayers({
  properties,
  enablePins = true,
  enableHeatmap = true,
  selectedProperty,
  setSelectedProperty,
  weightKey = "lastPrice",
  pinColor = "#3b82f6",
  selectedPinColor = "#f59e0b",
}: PropertyPreviewLayersProps) {
  const map = useMapbox();
  const isMapStyleLoaded = useMapboxIsMapStyleLoaded();

  React.useEffect(() => {
    if (!map || !isMapStyleLoaded) return;

    const geojson = propertiesToGeoJSON(properties);

    const ensureSourceAndLayers = () => {
      // Source
      const existingSource = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!existingSource) {
        map.addSource(SOURCE_ID, { type: "geojson", data: geojson });
      } else {
        existingSource.setData(geojson);
      }

      // Heatmap layer
      if (!map.getLayer(HEATMAP_LAYER_ID)) {
        map.addLayer({
          id: HEATMAP_LAYER_ID,
          type: "heatmap",
          source: SOURCE_ID,
          maxzoom: 18,
          paint: {
            // increase weight as diameter breast height increases
            "heatmap-weight": {
              property: "dbh",
              type: "exponential",
              stops: [
                [1, 0],
                [10, 1],
              ],
            },
            "heatmap-radius": 20,
            // increase intensity as zoom level increases
            "heatmap-intensity": {
              type: "interval",
              stops: [
                [11, 1],
                [15, 2],
              ],
            },
            // assign color values be applied to points depending on their density
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(236,222,239,0)",
              0.2,
              "rgb(208,209,230)",
              0.4,
              "rgb(166,189,219)",
              0.6,
              "rgb(103,169,207)",
              0.8,
              "rgb(28,144,153)",
            ],
          },
        });
      }

      // Pins layer
      if (!map.getLayer(PINS_LAYER_ID)) {
        map.addLayer({
          id: PINS_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": 6,
            "circle-color": "black",
            "circle-stroke-color": "white",
            "circle-stroke-width": {
              type: "exponential",
              stops: [
                [8, 0],
                [9, 1],
              ],
            },
            "circle-opacity": {
              stops: [
                [16, 0],
                [17, 1],
              ],
            },
          },
        });
      }

      // Selected pin layer
      if (!map.getLayer(SELECTED_LAYER_ID)) {
        map.addLayer({
          id: SELECTED_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: selectedProperty
            ? ["==", ["get", "id"], selectedProperty.id]
            : ["==", ["get", "id"], "__none__"],
          paint: {
            "circle-radius": 6,
            "circle-color": "black",
            "circle-stroke-width": 1,
            "circle-stroke-color": "white",
            "circle-opacity": 1,
          },
          layout: {
            visibility: selectedProperty ? "visible" : "none",
          },
        });
      } else {
        map.setLayoutProperty(
          SELECTED_LAYER_ID,
          "visibility",
          selectedProperty ? "visible" : "none",
        );
        map.setFilter(
          SELECTED_LAYER_ID,
          selectedProperty
            ? ["==", ["get", "id"], selectedProperty.id]
            : ["==", ["get", "id"], "__none__"],
        );
      }
    };

    const onPinsClick = (e: mapboxgl.MapMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const property = feature.properties as Property;
      if (!property) return;
      setSelectedProperty?.(property);
    };

    const onPinsMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const popupRef: { current: mapboxgl.Popup | null } = { current: null };

    const onPinsMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const property = feature.properties as Property;
      if (!property) return;

      const popup = popupRef.current ?? new mapboxgl.Popup({ offset: 15, closeButton: false });
      popupRef.current = popup;

      popup
        .setLngLat([property.longitude ?? 0, property.latitude ?? 0])
        .setHTML(
          `<div style="font-size:13px;line-height:1.3;color:black" className="text-foreground bg-background">
            <div style="font-weight:600">${escapeHtml(property.name ?? "")}</div>
            <div>Built year: ${escapeHtml(escapeHtml(String(property.yearBuilt)))}</div>
            <div>Area (sqft): ${escapeHtml(formatNumberOrDash(Number(property.areaInSqFt)))}</div>
            <div style="display:${property.lastPriceDate ? "block" : "none"};">Last price: ${escapeHtml(formatNumberOrDash(Number(property.lastPrice)))}</div>
            <div style="display:${property.lastPriceDate ? "block" : "none"};">Last price Date: ${escapeHtml(property.lastPriceDate ?? "")}</div>
          </div>`,
        )
        .addTo(map);
    };

    const onPinsMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    };

    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    if (isMapStyleLoaded) {
      ensureSourceAndLayers();
    }
    map.on("click", PINS_LAYER_ID, onPinsClick);
    map.on("mouseenter", PINS_LAYER_ID, onPinsMouseEnter);
    map.on("mousemove", PINS_LAYER_ID, onPinsMouseMove);
    map.on("mouseleave", PINS_LAYER_ID, onPinsMouseLeave);

    return () => {
      map.off("click", PINS_LAYER_ID, onPinsClick);
      map.off("mouseenter", PINS_LAYER_ID, onPinsMouseEnter);
      map.off("mousemove", PINS_LAYER_ID, onPinsMouseMove);
      map.off("mouseleave", PINS_LAYER_ID, onPinsMouseLeave);
      popupRef.current?.remove();
    };
  }, [
    map,
    properties,
    enablePins,
    enableHeatmap,
    weightKey,
    pinColor,
    selectedPinColor,
    selectedProperty,
    setSelectedProperty,
    isMapStyleLoaded,
  ]);

  return null;
}
