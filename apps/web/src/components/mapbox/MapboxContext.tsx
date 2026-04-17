import * as React from "react";

export type MapboxContextValue = {
  map: mapboxgl.Map;
  isMapStyleLoaded: boolean;
};

export const MapboxContext = React.createContext<MapboxContextValue | null>(null);

export function useMapbox(): mapboxgl.Map | null {
  return React.useContext(MapboxContext)?.map ?? null;
}

export function useMapboxIsMapStyleLoaded(): boolean {
  return React.useContext(MapboxContext)?.isMapStyleLoaded ?? false;
}
