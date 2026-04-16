import * as React from "react";
import { MapboxProvider } from "./MapboxProvider";
import { PropertyPreviewLayers } from "./PropertyPreviewLayers";
import { cn } from "@gis-app/ui/lib/utils";
import type { BasisGrid, Property } from "@/routes/_app/index";
import { useMapbox } from "./MapboxContext";
import { BasisPreviewLayers } from "./BasisPreviewLayers";

function _getBoundsFromProperties(
  properties: Property[],
): [[number, number], [number, number]] | null {
  if (properties.length === 0) return null;
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const p of properties) {
    if (!p.longitude || !p.latitude || Number.isNaN(p.longitude) || Number.isNaN(p.latitude))
      continue;
    minLng = Math.min(minLng, p.longitude);
    minLat = Math.min(minLat, p.latitude);
    maxLng = Math.max(maxLng, p.longitude);
    maxLat = Math.max(maxLat, p.latitude);
  }

  if (
    !Number.isFinite(minLng) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLng) ||
    !Number.isFinite(maxLat)
  ) {
    return null;
  }

  // Mapbox fitBounds with zero-area bounds fails or zooms unusably (e.g. all null → 0,0).
  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;
  if (lngSpan < 1e-10 && latSpan < 1e-10) {
    return null;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

type FlyToOnSelectProps = {
  selectedProperty: Property | null;
  zoomOnSelect?: number;
};

function FlyToOnSelect({ selectedProperty, zoomOnSelect = 13 }: FlyToOnSelectProps) {
  const map = useMapbox();

  React.useEffect(() => {
    if (!map) return;
    if (selectedProperty === null || selectedProperty === undefined) return;

    if (!selectedProperty || !selectedProperty.latitude || !selectedProperty.longitude) return;

    map.flyTo({
      center: [selectedProperty.longitude, selectedProperty.latitude],
      zoom: zoomOnSelect,
      essential: true,
    });
  }, [map, selectedProperty, zoomOnSelect]);

  return null;
}

export type PropertyPreviewMapProps = {
  properties: Property[];
  selectedProperty: Property | null;
  basisGrids?: BasisGrid[];
  setSelectedProperty: (property: Property | null) => void;
  setMapBounds?: (
    bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number } | undefined,
  ) => void;
  setZoom?: (zoom: number | undefined) => void;
};

export const PropertyPreviewMap = React.memo(function PropertyPreviewMap({
  properties,
  basisGrids,
  selectedProperty,
  setSelectedProperty,
  setMapBounds,
  setZoom,
}: PropertyPreviewMapProps) {
  const [mapError, setMapError] = React.useState<string | null>(null);
  // const bounds = React.useMemo(() => getBoundsFromProperties(properties), [properties]);
  const defaultCenter = React.useMemo((): mapboxgl.LngLatLike => [-98, 39], []);

  return (
    <div className={cn(`relative size-full min-h-100`)}>
      <MapboxProvider
        mapOptions={{
          center: defaultCenter,
          zoom: 3.5,
          dragRotate: true,
          scrollZoom: true,
          boxZoom: true,
        }}
        // fitBounds={bounds ?? undefined}
        onMapError={(e) => {
          if (e && typeof e === "object" && "error" in e) {
            const wrapped = (e as { error?: unknown }).error;
            if (wrapped instanceof Error) {
              setMapError(wrapped.message);
              return;
            }
            if (
              wrapped &&
              typeof wrapped === "object" &&
              "message" in wrapped &&
              typeof (wrapped as { message: unknown }).message === "string"
            ) {
              setMapError((wrapped as { message: string }).message);
              return;
            }
          }
          setMapError(String(e));
        }}
      >
        {mapError && (
          <div className="absolute left-4 right-4 top-4 z-40 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Map error: {mapError}
          </div>
        )}
        <PropertyPreviewLayers
          properties={properties}
          selectedProperty={selectedProperty}
          setSelectedProperty={setSelectedProperty}
        />
        <BasisPreviewLayers basisGrids={basisGrids} />
        <MapSetter setZoom={setZoom} setMapBounds={setMapBounds} />
        <FlyToOnSelect selectedProperty={selectedProperty} zoomOnSelect={13} />
      </MapboxProvider>
    </div>
  );
});

function MapSetter({
  setZoom,
  setMapBounds,
}: {
  setZoom?: (zoom: number | undefined) => void;
  setMapBounds?: (
    bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number } | undefined,
  ) => void;
}) {
  const map = useMapbox();

  function onZoomEnd(map: mapboxgl.Map) {
    const zoom = map.getZoom().toFixed(2);
    setZoom?.(Number(zoom));
  }

  function onMoveEnd(map: mapboxgl.Map) {
    const mapBounds = map.getBounds();
    if (!mapBounds) return;
    const mapBoundsMap = {
      maxLat: Number(mapBounds.getNorth().toFixed(2)),
      maxLng: Number(mapBounds.getEast().toFixed(2)),
      minLat: Number(mapBounds.getSouth().toFixed(2)),
      minLng: Number(mapBounds.getWest().toFixed(2)),
    };
    setMapBounds?.(mapBoundsMap);
  }

  React.useEffect(() => {
    if (!map) return;

    map.on("zoomend", () => onZoomEnd(map));
    map.on("moveend", () => onMoveEnd(map));

    return () => {
      map.off("zoomend", () => onZoomEnd(map));
      map.off("moveend", () => onMoveEnd(map));
    };
  }, [map]);

  return null;
}
