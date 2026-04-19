import * as React from "react";
import { useMapbox, useMapboxIsMapStyleLoaded } from "./MapboxContext";
import type { BasisGrid } from "@/routes/_app/index";

const SOURCE_ID = "basis-grid-source";
const BASIS_GRID_LAYER_ID = "basis-overlay";

export type BasisPreviewLayersProps = {
  basisGrids?: BasisGrid[];
};

function cellPolygonFromCenter(
  latC: number,
  lonC: number,
  dlat: number,
  dlon: number,
): [number, number][] {
  const halfLat = dlat / 2.0;
  const halfLon = dlon / 2.0;

  const latS = latC - halfLat;
  const latN = latC + halfLat;
  const lonW = lonC - halfLon;
  const lonE = lonC + halfLon;

  // GeoJSON ring expects [lon, lat]
  return [
    [lonW, latS],
    [lonE, latS],
    [lonE, latN],
    [lonW, latN],
    [lonW, latS],
  ];
}

function basisGridsToGeoJSON(basisGrids: BasisGrid[]) {
  return {
    type: "FeatureCollection" as const,
    features: basisGrids.map((basisGrid) => {
      const ring = cellPolygonFromCenter(
        basisGrid.cellLat,
        basisGrid.cellLon,
        basisGrid.cellDlat,
        basisGrid.cellDlon,
      );
      return {
        type: "Feature" as const,
        id: basisGrid.id,
        properties: basisGrid,
        geometry: {
          type: "Polygon" as const,
          coordinates: [ring],
        },
      };
    }),
  } as const;
}

export const BasisPreviewLayers = React.memo(function BasisPreviewLayers({
  basisGrids,
}: BasisPreviewLayersProps) {
  const map = useMapbox();
  const isMapStyleLoaded = useMapboxIsMapStyleLoaded();

  React.useEffect(() => {
    if (!map || !isMapStyleLoaded) return;

    const ensureSourceAndLayers = () => {
      const geojson = basisGridsToGeoJSON(basisGrids ?? []);
      // Source
      const existingSource = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!existingSource) {
        map.addSource(SOURCE_ID, { type: "geojson", data: geojson });
      } else {
        existingSource.setData(geojson);
      }

      // Basis grid layer
      if (!map.getLayer(BASIS_GRID_LAYER_ID)) {
        map.addLayer({
          id: BASIS_GRID_LAYER_ID,
          source: SOURCE_ID,
          type: "fill",
          paint: {
            "fill-color": "#0080ff",
            "fill-opacity": 0.1,
          },
        });
        map.addLayer({
          id: BASIS_GRID_LAYER_ID + "-outline",
          source: SOURCE_ID,
          type: "line",
          paint: {
            "line-color": "#000",
            "line-width": 0.1,
          },
        });
        map.addLayer({
          id: BASIS_GRID_LAYER_ID + "-text",
          source: SOURCE_ID,
          type: "symbol",
          layout: {
            "text-field": ["concat", ["get", "renderBasisPsf"], " $psf"],
            "text-size": 10,
          },
          paint: {
            "text-color": "#000000", // Main text color
            "text-halo-color": "#ffffff", // Stroke color
            "text-halo-width": 2, // Stroke thickness
          },
        });
      }
    };

    if (isMapStyleLoaded) {
      ensureSourceAndLayers();
    }
  }, [map, basisGrids, isMapStyleLoaded]);

  return null;
});
