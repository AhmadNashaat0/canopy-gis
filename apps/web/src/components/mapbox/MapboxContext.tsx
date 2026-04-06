import * as React from "react";

export type MapboxContextValue = {
  map: mapboxgl.Map;
};

export const MapboxContext = React.createContext<MapboxContextValue | null>(null);

export function useMapbox(): mapboxgl.Map | null {
  return React.useContext(MapboxContext)?.map ?? null;
}
