import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import mapboxgl from "mapbox-gl";
import { SearchBox } from "@mapbox/search-js-react";
import { env } from "@gis-app/env/web";
import { MapboxContext } from "./MapboxContext";
import { Tabs, TabsList, TabsTrigger } from "@gis-app/ui/components/tabs";
import "mapbox-gl/dist/mapbox-gl.css";

const styles = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/standard-satellite",
};

export type MapboxProviderProps = {
  controls?: {
    navigation?: boolean;
    fullscreen?: boolean;
    scale?: boolean;
    geolocate?: boolean;
  };
  onMapError?: (error: unknown) => void;
  children?: ReactNode;
  className?: string;
};

export function MapboxProvider({
  controls = { navigation: true, fullscreen: true, scale: false, geolocate: false },
  onMapError,
  children,
}: MapboxProviderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isMapStyleLoaded, setIsMapStyleLoaded] = useState(false);
  const defaultCenter = useMemo((): mapboxgl.LngLatLike => [-98, 39], []);

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = env.VITE_MAPBOX_TOKEN;
    const mapInstance = new mapboxgl.Map({
      container: containerRef.current,
      style: styles.standard,
      center: defaultCenter,
      zoom: 3.5,
      dragRotate: true,
      scrollZoom: true,
      boxZoom: true,
    });

    mapRef.current = mapInstance;
    setMap(mapInstance);

    const onError = (e: unknown) => onMapError?.(e);
    mapInstance.on("error", onError);

    const navigationControl = controls.navigation ? new mapboxgl.NavigationControl() : null;
    // const fullscreenControl = controls.fullscreen ? new mapboxgl.FullscreenControl() : null;
    // const scaleControl = controls.scale ? new mapboxgl.ScaleControl() : null;
    // const geolocateControl = controls.geolocate ? new mapboxgl.GeolocateControl({}) : null;

    if (navigationControl) mapInstance.addControl(navigationControl, "top-right");
    // if (fullscreenControl) mapInstance.addControl(fullscreenControl, "top-right");
    // if (scaleControl) mapInstance.addControl(scaleControl, "bottom-left");
    // if (geolocateControl) mapInstance.addControl(geolocateControl, "top-right");

    // Keep map canvas sized correctly.
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(containerRef.current);

    const onLoad = () => {
      mapInstance.resize();
      requestAnimationFrame(() => {
        mapInstance.resize();
      });
    };

    mapInstance.on("load", onLoad);
    mapInstance.on("style.load", () => {
      setIsMapStyleLoaded(true);
    });
    mapInstance.on("styledataloading", () => {
      setIsMapStyleLoaded(false);
    });

    return () => {
      mapInstance.off("load", onLoad);
      mapInstance.off("error", onError);
      mapInstance.off("styledataloading", () => setIsMapStyleLoaded(false));
      mapInstance.remove();
      mapRef.current = null;
      setMap(null);
      ro.disconnect();
    };
  }, [env.VITE_MAPBOX_TOKEN]);

  return (
    <div className={"relative w-full h-full flex flex-col gap-4"}>
      {map ? (
        <MapboxContext.Provider value={{ map, isMapStyleLoaded }}>
          {children}
        </MapboxContext.Provider>
      ) : null}
      <div ref={containerRef} className="h-full w-full border" />
      <div className="absolute z-10 top-[10px] left-[10px] w-64">
        {map && (
          <SearchBox
            accessToken={env.VITE_MAPBOX_TOKEN}
            map={map}
            mapboxgl={mapboxgl}
            marker={true}
            theme={{
              cssText:
                ".Input{color:var(--foreground)!important;} .Input:focus{border:1px solid var(--border)!important;}",
              variables: {
                colorBackground: "var(--input)",
                colorBackgroundHover: "var(--secondary)",
                colorBackgroundActive: "var(--secondary)",
                colorText: "var(--foreground)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
              },
            }}
          />
        )}
      </div>
      <div className="absolute z-10 bottom-[10px] left-[10px] w-64">
        <Tabs defaultValue={styles.standard} onValueChange={(value) => map?.setStyle(value)}>
          <TabsList>
            <TabsTrigger value={styles.standard}>Standard</TabsTrigger>
            <TabsTrigger value={styles.satellite}>Satellite</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
