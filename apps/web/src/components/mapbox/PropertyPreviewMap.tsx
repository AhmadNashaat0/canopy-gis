import * as React from "react";
import { MapboxProvider } from "./MapboxProvider";
import { PropertyPreviewLayers } from "./PropertyPreviewLayers";
import { cn } from "@gis-app/ui/lib/utils";
import type { BasisGrid, Property } from "@/routes/_app/index";
import { useMapbox } from "./MapboxContext";
import { BasisPreviewLayers } from "./BasisPreviewLayers";

function FlyToOnSelect({ selectedProperty }: { selectedProperty: Property | null }) {
  const map = useMapbox();

  React.useEffect(() => {
    if (!map) return;
    if (selectedProperty === null || selectedProperty === undefined) return;

    if (!selectedProperty || !selectedProperty.latitude || !selectedProperty.longitude) return;

    map.flyTo({
      center: [selectedProperty.longitude, selectedProperty.latitude],
      zoom: 13,
      essential: true,
    });
  }, [map, selectedProperty]);

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
  return (
    <div className={cn(`relative size-full min-h-100`)}>
      <MapboxProvider
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
        <FlyToOnSelect selectedProperty={selectedProperty} />
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
