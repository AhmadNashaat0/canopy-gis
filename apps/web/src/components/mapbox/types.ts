export type PropertyPreview = {
  id?: string | number;
  name: string;
  lat: number;
  lng: number;
  lastPrice?: number | null;
};

export type PropertyPreviewPointFeatureProps = {
  pid: string;
  name: string;
  lastPrice: number;
};
