import * as React from "react";
import { MapboxProvider } from "./MapboxProvider";
import { PropertyPreviewLayers } from "./PropertyPreviewLayers";
import { useMapbox } from "./MapboxContext";
import { cn } from "@gis-app/ui/lib/utils";
import type { Property } from "@/routes/_app/index";

function getBoundsFromProperties(
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
  properties: Property[];
  selectedProperty: Property | null;
  zoomOnSelect?: number;
};

function FlyToOnSelect({ properties, selectedProperty, zoomOnSelect = 12 }: FlyToOnSelectProps) {
  const map = useMapbox();

  React.useEffect(() => {
    if (!map) return;
    if (selectedProperty === null || selectedProperty === undefined) return;

    const target = properties.find((p) => p.id === selectedProperty.id);
    if (!target || !target.latitude || !target.longitude) return;

    map.flyTo({
      center: [target.longitude, target.latitude],
      zoom: zoomOnSelect,
      essential: true,
    });
  }, [map, properties, selectedProperty, zoomOnSelect]);

  return null;
}

export type PropertyPreviewMapProps = {
  properties: Property[];
  isLoading: boolean;
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
};

export function PropertyPreviewMap({
  properties,
  isLoading,
  selectedProperty,
  setSelectedProperty,
}: PropertyPreviewMapProps) {
  const [mapError, setMapError] = React.useState<string | null>(null);
  const bounds = React.useMemo(() => getBoundsFromProperties(properties), [properties, isLoading]);
  const defaultCenter = React.useMemo((): mapboxgl.LngLatLike => [-98, 39], []);

  return (
    <div className={cn(`relative w-full h-full min-h-125`)}>
      <MapboxProvider
        mapOptions={{
          center: defaultCenter,
          zoom: 2,
          dragRotate: true,
          scrollZoom: true,
          boxZoom: true,
        }}
        fitBounds={bounds ?? undefined}
        fitBoundsOptions={{ padding: 48, duration: 700 }}
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
        {!isLoading && (
          <FlyToOnSelect properties={properties} selectedProperty={selectedProperty} />
        )}
        {!isLoading && (
          <PropertyPreviewLayers
            properties={properties}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
          />
        )}
      </MapboxProvider>
    </div>
  );
}
